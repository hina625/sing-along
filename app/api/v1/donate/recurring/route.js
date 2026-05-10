import { NextResponse } from 'next/server';
import { APIContracts, APIControllers, Constants as SDKConstants } from 'authorizenet';
import connectDB from '@/lib/connnectDB';
import donationModel from '@/lib/donationModel';
import { notify } from '@/lib/notify';
import { getAuth } from '@clerk/nextjs/server';

/**
 * Recurring donations via Authorize.Net ARB (Automated Recurring Billing).
 *
 * POST   { cardNumber, expiryMonth, expiryYear, cvv, amount, email,
 *          firstName, lastName, frequency: 'weekly'|'monthly'|'yearly' }
 *        → creates an ARB subscription that bills indefinitely until cancelled.
 *
 * DELETE { subscriptionId, donorUserId? }
 *        → cancels an active subscription.
 */

function getMerchantAuth() {
    const auth = new APIContracts.MerchantAuthenticationType();
    auth.setName(process.env.AUTHORIZENET_API_LOGIN_ID);
    auth.setTransactionKey(process.env.AUTHORIZENET_TRANSACTION_KEY);
    return auth;
}

function intervalForFrequency(frequency) {
    // ARB schedule.interval: { length, unit }
    // unit: 'days' (1-365) | 'months' (1-12). Yearly = 12 months.
    if (frequency === 'weekly')  return { length: 7, unit: APIContracts.ARBSubscriptionUnitEnum.DAYS };
    if (frequency === 'yearly')  return { length: 12, unit: APIContracts.ARBSubscriptionUnitEnum.MONTHS };
    // default monthly
    return { length: 1, unit: APIContracts.ARBSubscriptionUnitEnum.MONTHS };
}

function nextChargeAfter(frequency, fromDate = new Date()) {
    const d = new Date(fromDate);
    if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            cardNumber, expiryMonth, expiryYear, cvv,
            amount, email, firstName, lastName,
            frequency = 'monthly',
        } = body;

        if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !amount) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }
        if (Number(amount) <= 0) {
            return NextResponse.json({ success: false, message: 'Amount must be greater than 0' }, { status: 400 });
        }
        if (!['weekly', 'monthly', 'yearly'].includes(frequency)) {
            return NextResponse.json({ success: false, message: 'Invalid frequency' }, { status: 400 });
        }

        // ---- Build ARB request ----
        const interval = intervalForFrequency(frequency);
        const intervalObj = new APIContracts.PaymentScheduleType.Interval();
        intervalObj.setLength(interval.length);
        intervalObj.setUnit(interval.unit);

        const today = new Date();
        const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const schedule = new APIContracts.PaymentScheduleType();
        schedule.setInterval(intervalObj);
        schedule.setStartDate(startDate);
        schedule.setTotalOccurrences(9999); // ongoing
        schedule.setTrialOccurrences(0);

        const creditCard = new APIContracts.CreditCardType();
        creditCard.setCardNumber(cardNumber);
        creditCard.setExpirationDate(`${expiryMonth}-${expiryYear}`);
        creditCard.setCardCode(cvv);

        const payment = new APIContracts.PaymentType();
        payment.setCreditCard(creditCard);

        const billTo = new APIContracts.NameAndAddressType();
        billTo.setFirstName((firstName || '').slice(0, 50));
        billTo.setLastName((lastName || '').slice(0, 50));

        const customerData = new APIContracts.CustomerType();
        if (email) customerData.setEmail(email);

        const subscription = new APIContracts.ARBSubscriptionType();
        subscription.setName(`Singalong ${frequency} gift`);
        subscription.setPaymentSchedule(schedule);
        subscription.setAmount(Number(amount));
        subscription.setPayment(payment);
        subscription.setBillTo(billTo);
        if (email) subscription.setCustomer(customerData);

        const createReq = new APIContracts.ARBCreateSubscriptionRequest();
        createReq.setMerchantAuthentication(getMerchantAuth());
        createReq.setSubscription(subscription);

        const ctrl = new APIControllers.ARBCreateSubscriptionController(createReq.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);

        const result = await new Promise((resolve, reject) => {
            ctrl.execute(() => {
                const apiResponse = ctrl.getResponse();
                const response = new APIContracts.ARBCreateSubscriptionResponse(apiResponse);
                if (!response) return reject({ success: false, error: 'No response from gateway' });

                if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                    resolve({ success: true, subscriptionId: response.getSubscriptionId() });
                } else {
                    const msg = response.getMessages().getMessage()?.[0];
                    reject({
                        success: false,
                        error: msg ? `${msg.getCode()}: ${msg.getText()}` : 'Subscription create failed',
                    });
                }
            });
        });

        // ---- Persist ----
        await connectDB();
        const { userId } = (typeof getAuth === 'function') ? getAuth(req) : { userId: null };

        const created = await donationModel.create({
            transactionId: null,
            subscriptionId: result.subscriptionId,
            isRecurring: true,
            frequency,
            nextChargeDate: nextChargeAfter(frequency, today),
            donorUserId: userId || null,
            firstName: firstName || '',
            lastName: lastName || '',
            email: email || '',
            amount: Number(amount),
            method: 'card',
            // Authorize.Net charges the first occurrence on/near the start date — but
            // not synchronously here. Mark as 'pending' until a Silent Post / IPN
            // confirms the first charge. (Matches webhook plumbing pattern from recordings.)
            status: 'pending',
        });

        // Thank-you notification for signed-in donors.
        if (userId) {
            await notify({
                userId,
                type: 'donation.received',
                title: '💛 Recurring gift set up',
                body: `Your ${frequency} gift of $${Number(amount).toLocaleString()} is scheduled. Be blessed.`,
                link: '/dashboard',
                icon: '💛',
            });
        }

        return NextResponse.json({
            success: true,
            subscriptionId: result.subscriptionId,
            donation: created,
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/v1/donate/recurring error:', error);
        const message = error?.error || error?.message || 'Subscription failed';
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { subscriptionId, donorUserId } = body || {};
        if (!subscriptionId) {
            return NextResponse.json({ success: false, message: 'subscriptionId is required' }, { status: 400 });
        }

        await connectDB();
        // Authorization: signed-in donor may cancel their own subscription.
        // Until per-host attribution exists, we accept the donorUserId from the body
        // and verify it matches the saved row.
        const row = await donationModel.findOne({ subscriptionId }).lean();
        if (!row) {
            return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
        }
        if (row.donorUserId && donorUserId && row.donorUserId !== donorUserId) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        // ---- Cancel via ARB ----
        const cancelReq = new APIContracts.ARBCancelSubscriptionRequest();
        cancelReq.setMerchantAuthentication(getMerchantAuth());
        cancelReq.setSubscriptionId(subscriptionId);

        const ctrl = new APIControllers.ARBCancelSubscriptionController(cancelReq.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);

        await new Promise((resolve, reject) => {
            ctrl.execute(() => {
                const apiResponse = ctrl.getResponse();
                const response = new APIContracts.ARBCancelSubscriptionResponse(apiResponse);
                if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                    resolve();
                } else {
                    const msg = response.getMessages().getMessage()?.[0];
                    reject({ error: msg ? `${msg.getCode()}: ${msg.getText()}` : 'Cancel failed' });
                }
            });
        });

        await donationModel.updateOne(
            { subscriptionId },
            { status: 'cancelled', cancelledAt: new Date(), nextChargeDate: null }
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/v1/donate/recurring error:', error);
        return NextResponse.json({ success: false, message: error?.error || error?.message || 'Cancel failed' }, { status: 500 });
    }
}
