import { EMAIL_ICONS } from "./email-icon-urls.js";

export const buildWelcomeHtml = (setupUrl: string, email: string): string => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Welcome to Aroma AR</title>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;}
    body{margin:0!important;padding:0!important;background-color:#f0ebe4;}
    img{border:0;outline:0;text-decoration:none;-ms-interpolation-mode:bicubic;}

    /* ── Mobile: max-width 480px ── */
    @media screen and (max-width:480px){
      /* Wrapper */
      .ew{width:100%!important;border-radius:0!important;}

      /* Header */
      .hp{padding:20px 16px 18px!important;}
      .hl{font-size:22px!important;line-height:30px!important;}
      .sub-txt{font-size:11px!important;}
      .eyebrow{font-size:8px!important;}

      /* Body */
      .bp{padding:18px 14px!important;}
      .body-text{font-size:13px!important;line-height:1.6!important;}
      .cb{padding:11px 20px!important;font-size:13px!important;}

      /* Cards outer gap */
      .cl {padding:0 3px 6px 0!important;}
      .cr {padding:0 0 6px 3px!important;}
      .clb{padding:0 3px 0  0!important;}
      .crb{padding:0 0  0  3px!important;}

      /* Card inner padding */
      .ci{padding:8px 6px!important;}

      /* Card title — smaller, tighter */
      .ct{font-size:10px!important;line-height:1.3!important;margin-bottom:0!important;}

      /* Card description — hide to save height */
      .cd{display:none!important;max-height:0!important;overflow:hidden!important;mso-hide:all!important;}

      /* Icon box — shrink to 28x28 */
      .icon-td{
        width:28px!important;
        height:28px!important;
        min-width:28px!important;
        border-radius:5px!important;
        line-height:0!important;
      }

      /* Icon image — shrink to 18x18 */
      .icon-img{
        width:28px!important;
        height:28px!important;
        max-width:28px!important;
      }

      /* Footer */
      .fp{padding:14px!important;}
      .ft{font-size:10px!important;}
      .fc{font-size:9px!important;}

      /* Signoff */
      .so-text{font-size:12px!important;}
      .so-name{font-size:13px!important;}
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
    .ew { width: 560px !important; }
  
    /* Dark mode */
    @media (prefers-color-scheme:dark){
      .dm-bg  { background-color:#1c1008 !important; }
      .dm-card{ background-color:#2a1a0a !important; border-color:#3a2510 !important; }
      .dm-text{ color:#e8d5b0 !important; }
    }
    [data-ogsc] .dm-bg  { background-color:#1c1008 !important; }
    [data-ogsc] .dm-card{ background-color:#2a1a0a !important; }
    [data-ogsc] .dm-text{ color:#e8d5b0 !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0ebe4;">

<!-- PREHEADER: shows as preview text in inbox (after subject line) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0ebe4;line-height:1px;">
  Your Aroma AR account is ready. Set up your access and start managing your restaurant menus in augmented reality.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0ebe4;">
<tr><td align="center" style="padding:20px 12px;">

<table role="presentation" class="ew" width="100%" cellpadding="0" cellspacing="0" border="0"
  class="dm-bg" style="width:100%;max-width:560px;background-color:#fdfaf6;border-radius:8px;overflow:hidden;box-shadow:0 2px 18px rgba(30,12,2,0.13);">

  <!-- HEADER -->
  <tr>
    <td bgcolor="#1c1008" style="background-color:#1c1008;padding:28px 24px 24px;">

      <!-- LOGO: text only, fully inlined, no classes -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;border-collapse:collapse;">
        <tr>
          <!-- Left orange bar -->
          <td bgcolor="#c2660a" width="3" style="background-color:#c2660a;width:3px;font-size:0;line-height:0;mso-line-height-rule:exactly;">
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="3" height="30" alt="" role="presentation" style="display:block;border:0;">
          </td>
          <!-- Spacer -->
          <td width="12" style="width:12px;font-size:0;line-height:0;">
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="12" height="1" alt="" role="presentation" style="display:block;border:0;">
          </td>
          <!-- Brand name -->
          <td valign="middle" style="vertical-align:middle;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#f5c97a;letter-spacing:3px;line-height:1;mso-line-height-rule:exactly;">AROMA</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;color:#c2660a;letter-spacing:2px;line-height:1;mso-line-height-rule:exactly;">&nbsp;AR</span>
          </td>
        </tr>
      </table>

      <!-- Eyebrow -->
      <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#a07040;mso-line-height-rule:exactly;">Account Activated</p>

      <!-- Headline -->
      <p class="hl" style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;line-height:36px;color:#ffffff;mso-line-height-rule:exactly;">
        Welcome to<br><span style="color:#f5c97a;font-style:italic;">Aroma AR</span>
      </p>

      <!-- Subtext -->
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#907050;line-height:18px;mso-line-height-rule:exactly;">Your restaurant's AR menu experience starts here.</p>

    </td>
  </tr>
    <!-- Accent bar -->
  <tr><td style="background-color:#c2660a;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- BODY -->
  <tr>
    <td class="bp dm-bg" style="background-color:#fdfaf6;padding:24px;">

      <p class="dm-text" style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.75;color:#3a2410;">Hi there,</p>
      <p class="dm-text" style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.75;color:#3a2410;">
        Welcome aboard! Your Aroma AR account is now ready. You've been set up as a
        <strong style="font-weight:700;color:#1c1008;">Company Administrator</strong> &mdash;
        you now have full access to manage your restaurants on the platform.
      </p>

      <!-- Badge -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="background-color:#fef5e4;border:1px solid #ddb96a;border-radius:4px;padding:5px 14px 5px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:7px;vertical-align:middle;">
                  <div style="width:6px;height:6px;background-color:#d4890a;border-radius:50%;"></div>
                </td>
                <td style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#7a4e10;letter-spacing:0.03em;white-space:nowrap;vertical-align:middle;">
                  Company Administrator &middot; Full Access
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- CTA intro -->
      <p style="margin:0 0 14px 0;font-family:Arial,sans-serif;font-size:13px;color:#5a3a20;">To get started, set up your account by clicking below:</p>

      <!-- CTA Button — VML fallback for Outlook, standard for all others -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
        <tr>
          <td align="left">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
              href="${setupUrl}"
              style="height:48px;v-text-anchor:middle;width:200px;"
              arcsize="10%" stroke="f" fillcolor="#c2660a">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">
                Setup My Account &rarr;
              </center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${setupUrl}" class="cb"
              style="display:inline-block;background-color:#c2660a;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;padding:14px 30px;border-radius:5px;mso-hide:all;">
              Setup My Account &nbsp;&rarr;
            </a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
        <tr><td style="border-top:1px solid #e8ddd0;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

      <!-- Section label -->
      <p style="margin:0 0 14px 0;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#a07040;">What you can do</p>

      <!-- CARDS ROW 1 -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="cl" width="50%" valign="top" style="padding:0 6px 10px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-card" style="background-color:#fef9f2;border:1px solid #e8ddd0;border-radius:6px;">
              <tr>
                <td class="ci" style="padding:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                    <tr>
                      <td class="icon-td" style="width:36px;height:36px;min-width:36px;max-width:36px;background-color:#fdefd8;border:1px solid #e8c882;border-radius:6px;text-align:center;vertical-align:middle;line-height:0;overflow:hidden;">
                        <img src="${EMAIL_ICONS.menus}" width="20" height="20" alt="Menu and dishes icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
                      </td>
                    </tr>
                  </table>
                  <p class="ct" style="margin:0 0 3px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1c1008;">Menus &amp; Dishes</p>
                  <p class="cd" style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#7a6050;line-height:1.5;">Create menus and add dishes with rich details.</p>
                </td>
              </tr>
            </table>
          </td>
          <td class="cr" width="50%" valign="top" style="padding:0 0 10px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-card" style="background-color:#fef9f2;border:1px solid #e8ddd0;border-radius:6px;">
              <tr>
                <td class="ci" style="padding:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                    <tr>
                      <td class="icon-td" style="width:36px;height:36px;min-width:36px;max-width:36px;background-color:#fdefd8;border:1px solid #e8c882;border-radius:6px;text-align:center;vertical-align:middle;line-height:0;overflow:hidden;padding:8px;">
                        <img src="${EMAIL_ICONS.qr}" width="20" height="20" alt="QR code generator icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
                      </td>
                    </tr>
                  </table>
                  <p class="ct" style="margin:0 0 3px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1c1008;">QR Generator</p>
                  <p class="cd" style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#7a6050;line-height:1.5;">Generate QR codes linking to your AR menu.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CARDS ROW 2 -->
        <tr>
          <td class="clb" width="50%" valign="top" style="padding:0 6px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-card" style="background-color:#fef9f2;border:1px solid #e8ddd0;border-radius:6px;">
              <tr>
                <td class="ci" style="padding:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                    <tr>
                      <td class="icon-td" style="width:36px;height:36px;min-width:36px;max-width:36px;background-color:#fdefd8;border:1px solid #e8c882;border-radius:6px;text-align:center;vertical-align:middle;line-height:0;overflow:hidden;padding:8px;">
                        <img src="${EMAIL_ICONS.team}" width="20" height="20" alt="Team management icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
                      </td>
                    </tr>
                  </table>
                  <p class="ct" style="margin:0 0 3px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1c1008;">Team Management</p>
                  <p class="cd" style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#7a6050;line-height:1.5;">Assign managers and control access levels.</p>
                </td>
              </tr>
            </table>
          </td>
          <td class="crb" width="50%" valign="top" style="padding:0 0 0 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-card" style="background-color:#fef9f2;border:1px solid #e8ddd0;border-radius:6px;">
              <tr>
                <td class="ci" style="padding:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                    <tr>
                      <td class="icon-td" style="width:36px;height:36px;min-width:36px;max-width:36px;background-color:#fdefd8;border:1px solid #e8c882;border-radius:6px;text-align:center;vertical-align:middle;line-height:0;overflow:hidden;padding:8px;">
                        <img src="${EMAIL_ICONS.ar}" width="20" height="20" alt="3D augmented reality icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
                      </td>
                    </tr>
                  </table>
                  <p class="ct" style="margin:0 0 3px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1c1008;">3D AR Showcase</p>
                  <p class="cd" style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#7a6050;line-height:1.5;">Let guests preview dishes in stunning 3D AR.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Sign-off -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:13px;color:#5a3a20;line-height:1.8;">
            <p style="margin:0 0 10px 0;">If you have any questions, our support team is always here to help.</p>
            <p style="margin:0 0 3px 0;">Warm regards,</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#1c1008;">The Aroma AR Team</p>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td class="fp" style="background-color:#1c1008;padding:20px 24px;border-top:2px solid #2e1c0c;">
      <p style="margin:0 0 7px 0;font-family:Arial,sans-serif;font-size:11px;color:#6a4a28;line-height:1.6;">
        This invitation was sent to
        <a href="mailto:${email}" style="color:#c8955a;text-decoration:none;font-family:Arial,sans-serif;">${email}</a>.
        If you didn't expect this, you can safely ignore it.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#3e2810;letter-spacing:0.04em;">
        &copy; ${new Date().getFullYear()} Aroma AR &middot; All rights reserved
      </p>
        <p style="margin:6px 0 0 0;font-family:Arial,sans-serif;font-size:10px;color:#5a3a20;line-height:1.6;">
          Aroma AR Inc. &middot; 123 Tech Lane, San Francisco, CA
        </p>
        <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:10px;line-height:1.6;">
          <a href="#" style="color:#c8955a;text-decoration:underline;font-family:Arial,sans-serif;">Unsubscribe</a>
          &nbsp;&middot;&nbsp;
          <a href="#" style="color:#c8955a;text-decoration:underline;font-family:Arial,sans-serif;">Privacy Policy</a>
        </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
