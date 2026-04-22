import { NextResponse } from 'next/server';
import { APIContracts, APIControllers,Constants as SDKConstants } from 'authorizenet';
import subscriptionModel from '@/lib/userModel';
import sendEmail from '@/lib/sendEmail'
import { getAuth, clerkClient } from '@clerk/nextjs/server'


function formatDate(date) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    let day = String(date.getDate()).padStart(2, '0');
    
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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
            try {
                const message = `Donation Successful! 🎉

                    Hello ${firstName || ''} ${lastName || ''},

                    Thank you for your generous donation to HG Sing-Along! 🎤✨ Your support helps us continue to bring joy and create unforgettable karaoke experiences. We’re grateful to have you as part of our community!

                    Here are the details of your donation:

                    Amount Donated: ${amount}
                    Date of Donation: ${formatDate(new Date())}
                    Your contribution enables us to:

                    Expand our song library 🎶
                    Enhance karaoke features 🎤
                    Host special events and competitions 🎉
                    We truly appreciate your support, and we hope you continue enjoying the fun and excitement that HG Sing-Along offers. If you have any questions or need assistance, feel free to contact us anytime!

                    Keep singing and spreading joy!

                    Best regards,
                    The HG Sing-Along Team
    
                    `
    
                await sendEmail(email,'Subscription Successful! 🎉',message); 
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



