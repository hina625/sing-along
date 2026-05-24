import { NextResponse } from 'next/server';
import { APIContracts, APIControllers,Constants as SDKConstants } from 'authorizenet';
import subscriptionModel from '@/lib/userModel';
import donationModel from '@/lib/donationModel';
import connectDB from '@/lib/connnectDB';
import { notify } from '@/lib/notify';
import sendEmail from '@/lib/sendEmail'
import { getAuth, clerkClient } from '@clerk/nextjs/server'


function formatDate(date) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    let day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
}

export const POST = async (req) => {
    try {
        const { cardNumber, expiryMonth, expiryYear, cvv, email, firstName,lastName, amount } = await req.json();
        const constants = {
            apiLoginKey: process.env.AUTHORIZENET_API_LOGIN_ID, // Your Authorize.Net API Login ID
            transactionKey: process.env.AUTHORIZENET_TRANSACTION_KEY, // Your Authorize.Net Transaction Key
        };



      

        const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(constants.apiLoginKey);
        merchantAuthenticationType.setTransactionKey(constants.transactionKey);

        const creditCard = new APIContracts.CreditCardType();
        creditCard.setCardNumber(cardNumber);
        creditCard.setExpirationDate(`${expiryMonth}-${expiryYear}`);
        creditCard.setCardCode(cvv);

        const paymentType = new APIContracts.PaymentType();
        paymentType.setCreditCard(creditCard);

        const transactionSetting = new APIContracts.SettingType();
        transactionSetting.setSettingName('recurringBilling');
        transactionSetting.setSettingValue('false');

        const transactionSettingList = [transactionSetting];
        
        const transactionSettings = new APIContracts.ArrayOfSetting();
        transactionSettings.setSetting(transactionSettingList);

        const transactionRequestType = new APIContracts.TransactionRequestType();
        transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
        transactionRequestType.setPayment(paymentType);
        transactionRequestType.setAmount(amount);
        transactionRequestType.setTransactionSettings(transactionSettings);

        const createRequest = new APIContracts.CreateTransactionRequest();
        createRequest.setMerchantAuthentication(merchantAuthenticationType);
        createRequest.setTransactionRequest(transactionRequestType);

        const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);
     

        const response = await new Promise((resolve, reject) => {
            ctrl.execute(() => {
                const apiResponse = ctrl.getResponse();
                const response = new APIContracts.CreateTransactionResponse(apiResponse);

                if (response !== null) {
                    if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                        if (response.getTransactionResponse() && response.getTransactionResponse().getMessages()) {
                            console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
                            console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
                            console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
                            console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());
                            resolve({ success: true, transactionId: response.getTransactionResponse().getTransId() });
                        } else {
                            console.log('Failed Transaction.',1);
                            if(response.getTransactionResponse().getErrors() != null) {
                                console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
                                console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                                reject({ success: false, error: response.getTransactionResponse().getErrors().getError()[0].getErrorText() });
                            }
                        }
                    } else {
                        console.log('Failed Transaction.',2);
                        if (response.getTransactionResponse() && response.getTransactionResponse().getErrors()) {
                            console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
                            console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                            reject({ success: false, error: response.getTransactionResponse().getErrors().getError()[0].getErrorText() });
                        } else {
                            console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
                            console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
                            reject({ success: false, error: response.getMessages().getMessage()[0].getText() });
                        }
                    }
                } else {
                    reject({ success: false, error: 'No response.' });
                }
            });
        });


        if(response.success){
            // Log the donation so it shows up in dashboard analytics.
            try {
                const { userId } = (typeof getAuth === 'function') ? getAuth(req) : { userId: null };
                await connectDB();
                await donationModel.create({
                    transactionId: response.transactionId,
                    donorUserId: userId || null,
                    firstName: firstName || '',
                    lastName: lastName || '',
                    email: email || '',
                    amount: Number(amount) || 0,
                    method: 'card',
                    status: 'succeeded',
                });
                // Send the donor a thank-you notification (in-app), if they are signed in.
                if (userId) {
                    await notify({
                        userId,
                        type: 'donation.received',
                        title: '🎉 Partnership Support Received Successfully!',
                        body: `Thank you for partnering with Hallelujah Gospel Globally. Partnership Amount: $${Number(amount).toLocaleString()}.`,
                        link: '/dashboard',
                        icon: '🎉',
                    });
                }
            } catch (logErr) {
                console.error('Donation logging failed (non-fatal):', logErr?.message);
            }

            try {
                const fullName = `${firstName || ''} ${lastName || ''}`.trim();
                const message = `🎉 Partnership Support Received Successfully!

Hello ${fullName},

Thank you for partnering with Hallelujah Gospel Globally. Your support and generosity help us continue building meaningful connections and creating a platform that brings people together worldwide.

Partnership Amount: $${amount}
Date: ${formatDate(new Date())}

We truly appreciate your trust and support. Thank you for being part of our journey.

Warm regards,
The Hallelujah Gospel Globally Team`;

                await sendEmail(email, '🎉 Partnership Support Received Successfully!', message);
            } catch (error) {
                console.log('error during send mail : ', error.message)
            }

            return NextResponse.json(response,{status: 200});
        }else{
            return NextResponse.json(response,{status: 501});
        }

    } catch (error) {
        console.log(error)
        return NextResponse.json({ success: false, message: error.error || error.message }, { status: 500 });
    }
};



