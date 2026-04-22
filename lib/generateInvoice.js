export const generateInvoice = (date, amount, expire_date, username, email) => (`
    <!DOCTYPE html
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>6f7efac7-b391-4271-b6c2-67ed3ac063a5</title>
    <style type="text/css">
        * {
            margin: 0;
            padding: 0;
            text-indent: 0;
        }

        h1 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: bold;
            text-decoration: none;
            font-size: 18pt;
        }

        h2 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: bold;
            text-decoration: none;
            font-size: 9pt;
        }

        .s1 {
            color: black;
            font-family: Verdana, sans-serif;
            font-style: normal;
            font-weight: normal;
            text-decoration: none;
            font-size: 9pt;
        }

        .s2 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: bold;
            text-decoration: none;
            font-size: 9pt;
        }

        .s3 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: normal;
            text-decoration: none;
            font-size: 9pt;
        }

        .s4 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: normal;
            text-decoration: none;
            font-size: 9pt;
        }

        .s5 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: bold;
            text-decoration: none;
            font-size: 13.5pt;
        }

        .s6 {
            color: #625BFF;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: bold;
            text-decoration: underline;
            font-size: 9pt;
        }

        .s7 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: normal;
            text-decoration: none;
            font-size: 7.5pt;
        }

        h3 {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: bold;
            text-decoration: none;
            font-size: 7.5pt;
        }

        p {
            color: black;
            font-family: Tahoma, sans-serif;
            font-style: normal;
            font-weight: normal;
            text-decoration: none;
            font-size: 7.5pt;
            margin: 0pt;
        }

        table,
        tbody {
            vertical-align: top;
            overflow: visible;
        }
    </style>
</head>

<body>
    <p style="padding-top: 9pt;text-indent: 0pt;text-align: left;"><br /></p>
    <p style="text-indent: 0pt;text-align: left;"><span>
            <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td><img width="54" height="54"
                            src="data:image/png;base64,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" />
                    </td>
                </tr>
            </table>
        </span></p>
    <h1 style="padding-left: 5pt;text-indent: 0pt;text-align: left;">Invoice</h1>
    <h2 style="padding-top: 17pt;padding-left: 5pt;text-indent: 0pt;text-align: left;">Invoice number 867A7041-0018</h2>
    <p class="s1" style="padding-top: 2pt;padding-left: 5pt;text-indent: 0pt;text-align: left;">Date of issue ${date}</p>
    <p class="s1" style="padding-top: 2pt;padding-left: 5pt;text-indent: 0pt;text-align: left;">Date due ${date}</p>
    <p style="padding-top: 5pt;text-indent: 0pt;text-align: left;"><br /></p>
    <table style="border-collapse:collapse;margin-left:6pt" cellspacing="0">
        <tr style="height:78pt">
            <td style="width:276pt">
                <p class="s2" style="text-indent: 0pt;line-height: 11pt;text-align: left;">HG Sing Along</p>
                <p class="s3" style="padding-top: 2pt;text-indent: 0pt;text-align: left;">231 Market Place</p>
                <p style="padding-top: 2pt;padding-right: 128pt;text-indent: 0pt;line-height: 124%;text-align: left;"><a
                        href="mailto:tony_9162001@yahoo.com" class="s4" target="_blank">San Ramon, California 94583
                        United States tony_9162001@yahoo.com</a></p>
            </td>
            <td style="width:185pt">
                <p class="s2" style="text-indent: 0pt;line-height: 11pt;text-align: left;">Bill to</p>
                <p style="padding-top: 2pt;padding-right: 58pt;text-indent: 0pt;line-height: 124%;text-align: left;"><a
                        href="mailto:sahilmichael@yahoo.com" class="s4" target="_blank">${username} s${email}</a>
                </p>
            </td>
            <td style="width:91pt" rowspan="3">
                <p style="text-indent: 0pt;text-align: left;"><br /></p>
            </td>
        </tr>
        <tr style="height:34pt">
            <td style="width:276pt">
                <p class="s5" style="padding-top: 11pt;text-indent: 0pt;text-align: left;">$${amount}.00 due February  ${date}
                </p>
            </td>
            <td style="width:185pt">
                <p style="text-indent: 0pt;text-align: left;"><br /></p>
            </td>
        </tr>
        <tr style="height:31pt">
            <td style="width:276pt;border-bottom-style:solid;border-bottom-width:1pt">
                <p style="padding-top: 6pt;text-indent: 0pt;text-align: left;"><br /></p>
                <p class="s7" style="text-indent: 0pt;text-align: left;">Description</p>
            </td>
            <td style="width:185pt;border-bottom-style:solid;border-bottom-width:1pt">
                <p style="padding-top: 5pt;text-indent: 0pt;text-align: left;"><br /></p>
                <p class="s7" style="text-indent: 0pt;text-align: left;">Qty Unit price</p>
            </td>
            <td style="width:91pt;border-bottom-style:solid;border-bottom-width:1pt">
                <p style="padding-top: 5pt;text-indent: 0pt;text-align: left;"><br /></p>
                <p class="s7" style="text-indent: 0pt;text-align: right;">Amount</p>
            </td>
        </tr>
        <tr style="height:46pt">
            <td style="width:276pt;border-top-style:solid;border-top-width:1pt">
                <p class="s2" style="padding-top: 4pt;text-indent: 0pt;text-align: left;">Membership Plan</p>
                <p class="s3" style="padding-top: 2pt;text-indent: 0pt;text-align: left;">${date} - ${expire_date}</p>
            </td>
            <td
                style="width:185pt;border-top-style:solid;border-top-width:1pt;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#EBEBEB">
                <p class="s3" style="padding-top: 4pt;text-indent: 0pt;text-align: left;">1 $${amount}.00</p>
            </td>
            <td
                style="width:91pt;border-top-style:solid;border-top-width:1pt;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#EBEBEB">
                <p class="s3" style="padding-top: 4pt;text-indent: 0pt;text-align: right;">$${amount}.00</p>
            </td>
        </tr>
        <tr style="height:21pt">
            <td style="width:276pt">
                <p style="text-indent: 0pt;text-align: left;"><br /></p>
            </td>
            <td
                style="width:185pt;border-top-style:solid;border-top-width:1pt;border-top-color:#EBEBEB;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#EBEBEB">
                <p class="s3" style="padding-top: 4pt;text-indent: 0pt;text-align: left;">Subtotal</p>
            </td>
            <td
                style="width:91pt;border-top-style:solid;border-top-width:1pt;border-top-color:#EBEBEB;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#EBEBEB">
                <p class="s3" style="padding-top: 4pt;text-indent: 0pt;text-align: right;">$${amount}.00</p>
            </td>
        </tr>
        <tr style="height:21pt">
            <td style="width:276pt">
                <p style="text-indent: 0pt;text-align: left;"><br /></p>
            </td>
            <td
                style="width:185pt;border-top-style:solid;border-top-width:1pt;border-top-color:#EBEBEB;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#EBEBEB">
                <p class="s3" style="padding-top: 4pt;text-indent: 0pt;text-align: left;">Total</p>
            </td>
            <td
                style="width:91pt;border-top-style:solid;border-top-width:1pt;border-top-color:#EBEBEB;border-bottom-style:solid;border-bottom-width:1pt;border-bottom-color:#EBEBEB">
                <p class="s3" style="padding-top: 4pt;text-indent: 0pt;text-align: right;">$${amount}.00</p>
            </td>
        </tr>
        <tr style="height:16pt">
            <td style="width:276pt">
                <p style="text-indent: 0pt;text-align: left;"><br /></p>
            </td>
            <td style="width:185pt;border-top-style:solid;border-top-width:1pt;border-top-color:#EBEBEB">
                <p class="s2" style="padding-top: 4pt;text-indent: 0pt;line-height: 10pt;text-align: left;">Amount due
                </p>
            </td>
            <td style="width:91pt;border-top-style:solid;border-top-width:1pt;border-top-color:#EBEBEB">
                <p class="s2" style="padding-top: 4pt;text-indent: 0pt;line-height: 10pt;text-align: right;">$${amount}.00</p>
            </td>
        </tr>
    </table>
    <p style="text-indent: 0pt;text-align: left;"><br /></p>
    <p style="padding-left: 6pt;text-indent: 0pt;line-height: 1pt;text-align: left;" />
    <p style="padding-top: 1pt;text-indent: 0pt;text-align: left;"><br /></p>
    <h3 style="padding-left: 5pt;text-indent: 0pt;text-align: left;">Pay with ACH or wire transfer</h3>
    <p style="padding-top: 1pt;padding-left: 5pt;text-indent: 0pt;line-height: 115%;text-align: left;">Bank transfers,
        also known as ACH payments, can take up to five business days. To pay via ACH, transfer funds using the
        following bank information.</p>
    <p style="padding-top: 3pt;padding-left: 5pt;text-indent: 0pt;text-align: left;">Bank name WELLS FARGO BANK, N.A.
    </p>
    <p style="padding-top: 1pt;padding-left: 5pt;text-indent: 0pt;text-align: left;">Routing number 121000248</p>
    <p style="padding-top: 1pt;padding-left: 5pt;text-indent: 0pt;line-height: 115%;text-align: left;">Account number
        40630140525618222 SWIFT code WFBIUS6S</p>
    <p style="padding-top: 4pt;text-indent: 0pt;text-align: left;"><br /></p>
    <p style="padding-left: 5pt;text-indent: 0pt;text-align: left;">867A7041-0018 · $${amount}.00 due ${date} Page 1
        of 1</p>
    <p style="text-indent: 0pt;text-align: left;" />
</body>

</html>
`)