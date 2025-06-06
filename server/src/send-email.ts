import nodemailer from "nodemailer";
import { CommentsEmail, Email, assertCommentsEmail } from "./types.js";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import "dotenv/config";
import { CommentType, assertCommentType } from "@tsconline/shared";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const HtmlTemplate = (
  preHeader: string,
  title: string,
  message: string,
  action: string,
  link?: string,
  buttonText?: string
) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
  
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Email Confirmation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
    /**
     * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
     */
    @media screen {
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 400;
        src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
      }
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 700;
        src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
      }
    }
    /**
     * Avoid browser level font resizing.
     * 1. Windows Mobile
     * 2. iOS / OSX
     */
    body,
    table,
    td,
    a {
      -ms-text-size-adjust: 100%; /* 1 */
      -webkit-text-size-adjust: 100%; /* 2 */
    }
    /**
     * Remove extra space added to tables and cells in Outlook.
     */
    table,
    td {
      mso-table-rspace: 0pt;
      mso-table-lspace: 0pt;
    }
    /**
     * Better fluid images in Internet Explorer.
     */
    img {
      -ms-interpolation-mode: bicubic;
    }
    /**
     * Remove blue links for iOS devices.
     */
    a[x-apple-data-detectors] {
      font-family: inherit !important;
      font-size: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      color: inherit !important;
      text-decoration: none !important;
    }
    /**
     * Fix centering issues in Android 4.4.
     */
    div[style*="margin: 16px 0;"] {
      margin: 0 !important;
    }
    body {
      width: 100% !important;
      height: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    /**
     * Collapse table borders to avoid space between cells.
     */
    table {
      border-collapse: collapse !important;
    }
    a {
      color: #1a82e2;
    }
    img {
      height: auto;
      line-height: 100%;
      text-decoration: none;
      border: 0;
      outline: none;
    }
    </style>
  
  </head>
  <body style="background-color: #e9ecef;">
  
    <!-- start preheader -->
    <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
      ${preHeader}
    </div>
    <!-- end preheader -->
  
    <!-- start body -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
  
      <!-- start logo -->
      <tr>
        <td align="center" bgcolor="#e9ecef">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="center" valign="top" style="padding: 36px 24px;">
                <a href="https://dev.timescalecreator.org" target="_blank" style="display: inline-block;">
                  <img src="https://dev.timescalecreator.org/assets/TSCreatorLogo-BBvqDlKG.png" alt="Logo" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
                </a>
              </td>
            </tr>
          </table>
          <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
      <!-- end logo -->
  
      <!-- start hero -->
      <tr>
        <td align="center" bgcolor="#e9ecef">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">${title}</h1>
              </td>
            </tr>
          </table>
          <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
      <!-- end hero -->
  
      <!-- start copy block -->
      <tr>
        <td align="center" bgcolor="#e9ecef">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
  
            <!-- start copy -->
            <tr>
              <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                <p style="margin: 0;">${message}</p>
              </td>
            </tr>
            <!-- end copy -->
            ${
              buttonText && link
                ? `
              <!-- start button -->
              <tr>
                <td align="left" bgcolor="#ffffff">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                        <table border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" bgcolor="#1a82e2" style="border-radius: 6px;">
                              <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">${buttonText}</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- end button -->
              <!-- start copy -->
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                  <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
                  <p style="margin: 0;"><a href="${link}" target="_blank">${link}</a></p>
                </td>
              </tr>
              <!-- end copy -->
            `
                : ""
            }
  
            <!-- start copy -->
            <tr>
              <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf">
                <p style="margin: 0;">Thank You,<br> TSC Online</p>
              </td>
            </tr>
            <!-- end copy -->
  
          </table>
          <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
      <!-- end copy block -->
  
      <!-- start footer -->
      <tr>
        <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
  
            <!-- start permission -->
            <tr>
              <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                <p style="margin: 0;">You received this email because we received a request for ${action} for your account. If you didn't request this you can safely delete this email.</p>
              </td>
            </tr>
            <!-- end permission -->
  
          </table>
          <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
      <!-- end footer -->
  
    </table>
    <!-- end body -->
  
  </body>
  </html>`;
};

export const sendEmail = async (email: Email) => {
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  const html = HtmlTemplate(
    purify.sanitize(email.preHeader),
    purify.sanitize(email.title),
    purify.sanitize(email.message),
    purify.sanitize(email.action),
    email.link ? purify.sanitize(email.link) : undefined,
    email.buttonText ? purify.sanitize(email.buttonText) : undefined
  );
  try {
    await transporter.sendMail({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: html
    });
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
};

function formatTime(date: Date) {
  let hours = date.getHours();
  let minutes: string | number = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return hours + ":" + minutes + " " + ampm;
}

const commentsToHtml = (comments: CommentType[]): string => {
  let commentsDict: { [key: string]: CommentType[] } = {};
  let result = "";

  // group comments by datapack title
  for (const com of comments) {
    assertCommentType(com);
    const loadedComment: CommentType = {
      id: com.id,
      username: com.username,
      uuid: com.uuid,
      pictureUrl: com.pictureUrl,
      dateCreated: new Date(com.dateCreated),
      flagged: Boolean(com.flagged),
      commentText: com.commentText,
      datapackTitle: com.datapackTitle
    };
    if (loadedComment.datapackTitle in commentsDict) {
      commentsDict[loadedComment.datapackTitle]!.push(loadedComment);
    } else {
      commentsDict[loadedComment.datapackTitle] = [loadedComment];
    }
  }
  // convert sorted comments to HTML
  for (const title of Object.keys(commentsDict)) {
    result += `<tr>
                <td align="left" bgcolor="#ffffff" style="padding: 0px 24px 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                  <p style="margin: 0; color: #1a82e2"><strong>Datapack: ${title}</strong></p>
                </td>
              </tr>`;
    if (commentsDict[title]!.length > 0) {
      for (const comment of commentsDict[title]!) {
        result += `<tr>
                    <td bgcolor="#ffffff" style="padding: 0 24px 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 12px;">
                        <p style="margin: 0;">• <strong>Username:</strong> ${comment.username}</p>
                        <p style="margin-left: 8px;"><strong>UUID:</strong> ${comment.uuid}</p>
                        <p style="margin-left: 8px;"><strong>Time:</strong> ${formatTime(comment.dateCreated)}</p>
                        <p style="margin-left: 8px;"><strong>Comment:</strong> ${comment.commentText}</p>
                    </td>
                </tr>`;
      }
    }
  }
  return result;
};

const CommentsSummaryHtmlTemplate = (
  title: string,
  message: string,
  commentsHtml: string,
  link?: string,
  buttonText?: string
) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
  
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Comment Update</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
    /**
     * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
     */
    @media screen {
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 400;
        src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
      }
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 700;
        src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
      }
    }
    /**
     * Avoid browser level font resizing.
     * 1. Windows Mobile
     * 2. iOS / OSX
     */
    body,
    table,
    td,
    a {
      -ms-text-size-adjust: 100%; /* 1 */
      -webkit-text-size-adjust: 100%; /* 2 */
    }
    /**
     * Remove extra space added to tables and cells in Outlook.
     */
    table,
    td {
      mso-table-rspace: 0pt;
      mso-table-lspace: 0pt;
    }
    /**
     * Better fluid images in Internet Explorer.
     */
    img {
      -ms-interpolation-mode: bicubic;
    }
    /**
     * Remove blue links for iOS devices.
     */
    a[x-apple-data-detectors] {
      font-family: inherit !important;
      font-size: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      color: inherit !important;
      text-decoration: none !important;
    }
    /**
     * Fix centering issues in Android 4.4.
     */
    div[style*="margin: 16px 0;"] {
      margin: 0 !important;
    }
    body {
      width: 100% !important;
      height: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    /**
     * Collapse table borders to avoid space between cells.
     */
    table {
      border-collapse: collapse !important;
    }
    a {
      color: #1a82e2;
    }
    img {
      height: auto;
      line-height: 100%;
      text-decoration: none;
      border: 0;
      outline: none;
    }
    </style>
  
  </head>
  <body style="background-color: #e9ecef;">
  
    <!-- start body -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
  
      <!-- start logo -->
      <tr>
        <td align="center" bgcolor="#e9ecef">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="center" valign="top" style="padding: 36px 24px;">
                <a href="https://dev.timescalecreator.org" target="_blank" style="display: inline-block;">
                  <img src="https://dev.timescalecreator.org/assets/TSCreatorLogo-BBvqDlKG.png" alt="Logo" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- end logo -->
  
      <!-- start hero -->
      <tr>
        <td align="center" bgcolor="#e9ecef">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -1px; line-height: 48px;">${title}</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- end hero -->
  
      <!-- start comment block -->
      <tr>
        <td align="center" bgcolor="#e9ecef">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
  
           
            <tr>
              <td align="left" bgcolor="#ffffff" style="padding: 0 24px 16px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                <p style="margin: 0;">${message}</p>
              </td>
            </tr>
             <!-- start comment -->
            ${commentsHtml}
            <!-- end comment -->
              <!-- start button -->
              <tr>
                <td align="left" bgcolor="#ffffff">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                        <table border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" bgcolor="#1a82e2" style="border-radius: 6px;">
                              <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">${buttonText}</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- end button -->
              <!-- start link text -->
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                  <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
                  <p style="margin: 0;"><a href="${link}" target="_blank">${link}</a></p>
                </td>
              </tr>
              <!-- end link text -->
            
          </table>
        </td>
      </tr>
      <!-- end comment block -->
  
      <!-- start footer -->
      <tr>
        <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
        </td>
      </tr>
      <!-- end footer -->
  
    </table>
    <!-- end body -->
  
  </body>
</html>
  `;
};

export const sendCommentsEmail = async (email: CommentsEmail) => {
  assertCommentsEmail(email);
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  const html = CommentsSummaryHtmlTemplate(
    purify.sanitize(email.title),
    purify.sanitize(email.message),
    commentsToHtml(email.comments),
    email.link ? purify.sanitize(email.link) : undefined,
    email.buttonText ? purify.sanitize(email.buttonText) : undefined
  );
  try {
    await transporter.sendMail({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: html
    });
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
};
