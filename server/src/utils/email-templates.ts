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
              href="\${setupUrl}"
              style="height:48px;v-text-anchor:middle;width:200px;"
              arcsize="10%" stroke="f" fillcolor="#c2660a">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">
                Setup My Account &rarr;
              </center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="\${setupUrl}" class="cb"
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
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAADzklEQVR4nOyczXLTMBDHJacz0DxIj/AETdIDNy68A2nfgrS8RVMOvAEXphcO+eiJI9yA90gpQyy8GTvjCfZa0q6UVN3fKYl2LPnvlbSS1jlSAokjJZAQAYl0Cjh7+3zU03pitF7keT4/+/B73mR3Nz5+U9i8gs9Gq8/D69UtxQ6rF8qyLBvBZyizaV8oNFa4OO9fFgaT+m/rPD/bbeTyon+ljHq3c+X3g+vVxMcOq7eprI5R6mo4XV2qSKACLs/7pun3uoh342cnRvd+NNmZP+uT4ceHXy52WL3KmLnSeqQ6iCli1lYA3URZYEz2oq1MH2UvXe1s68UADwVPVRHIFJE8a/fiepmtHYqF921NCxE5HkYXZAEPmV6WzUKLmLSAAMzQKiDJCwjdPuR4mL6AKux4mIyAEFph5aG6cjICQlwK8V+rQdGVQ3hhUl14EzxDsN1CCC9MbgxcGxPVC5MTcLPEjOiFSc7CMb0wSQG7vJCTZONAzAs5u3GyAqIbqw6bEl2kvRJBujHXOJi0gFg3ro4EqJAFzHJlbMps7WKhjRkqBsgCmr/5t7YyrfPvrnacxJiNyQJuzjKKg6H/CorfTm8efrraRYNpImE5F4ZTtcVF/6s26jV8L7rHl9Pp/Sdfu8cE28F6eb57y2XHBZwXF/uBIxWIJ7Gh2gZHKJO8gJCtoAJycLkxXPFZLFo9EFsKhT7paiXSBoELeBfeQ4NbA1zPtoT2aL8xMNBR4eaaLfEZzKaKGY5MLlRAbC3JfVQI18KyrnzoyuTigDQLQ+oEhyfCNeBamI1rtlXXA0FP8BxAZ2Fw8eX4GE0pg0YWNsOqi1VhQ1P32PXY2mQ0UgguN1slZnYt1bjS36yyogqBZj5rx3qeHqU7DaYr3dUOsLFtJ2f+oFUcCGNhz0PAMk9v+1l50JVxUFEOJSMbW87kS6sxsPPUHwHCEl/xoE7bmdK2DtsHYov1JAJPzatyn22jIuaDuljTdMtrciehOy3lysp10PCguNHBzT2rlwS5Zoldam0LVQizWT34blCWK4wq5sQ8xGsyCygeQNpMqHexQ7y5GMibSkREQCIiIBERkIgISEQEJCICEhEBiYiARERAIiIgERGQiAhIRAQkIgISEQGJiIBEREAiIiAREZCICEhEBCQiAhIRAYmIgEREQCIiIBERkIgISGSvAoZ49yN2HWwvG6J/dvOI6nBlrx4Y4592Q9fB5oGu/0/gk7Qeow5XSCm+TVhlqhIzU2PUYQv7C9ebRmNewnBjMeqwhd0DK7YJ6JDNX0sk53zNIEYdXfwDAAD//5LQDfgAAAAGSURBVAMASVsSxjpkqt4AAAAASUVORK5CYII=" width="20" height="20" alt="Menu and dishes icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
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
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAFfElEQVR4nOycTWhdRRTH/2feK2mSutCV3eiiiAsVqrgQq/nwA6U7tXFdrI0b7aIgKGg/oqAgVFA3Jla6joo7UawmqVZcacG6EHGhm7qySJqkoe/d45ybJnaRuXdmzr0374X5bRK4Z4aZ/5t7Z86ZM9NGQkUbCRVJQCVJQCVJQCVJQCVBAs4dHL4VA9hLnN0EJQZ0rcPm90dmrvwKBd8e3nVXm7I7MvAOKGEyi1jFhfEzS3/7liEfo/OHh/dmho8x4ylUDAMXGTw1Nr3ySUi5+cnBCQIdsx24GxVDhM9NRlP7ZpYulNqWGZx7YfCA/WmCOheDFfHt0emVV31sFyYH37LivYK6IZ4Y+XDl00KToocy8rrEP6MpiI/YBr9fZGJ/0JfsD/oeGqLFdG/RSDRFheW1RZNYYb5/Ds7va/6sQfGEMg2cAsqEUcc3r4xrreFnYp7VhWiQT54O3CPQzrbYAlomuy/mWa0UaOFcxqwtVTb/RNolw7Py134fnrAf/z3whIj+sWV/sDPvX3YZM+uwKlgiuZ9Jm2xrb7P1PsjMt8CfXzLCd/KPq01Fy7bohbQhOmiF2O+5EsphaQzo6YzpcdsqVAmzuWyIZ/Nayb9NljFD2JMxn0EEUQIaxsPIxYujbfgNrlY/XZ2M/fZtusRBuq9hEMc9UGA7+gAqRltnyKfoRpIvrCQJqCQJqCQJqCQJqCQJqCQJqCQJqCQJqCQJqCTKlZOoCnRcQvWo6oztU5SAEpKCCn4HlaOrM7ZPUQJKPK9rQ1I2avQjwrCjhI+OTK+8i4pZq5OPInAkSh+kL9InROD8Bsq+bcGzWYnnRYSPdtsmnzo3OXTKacHoxDyzdUYFsySK0yL+uiiuWayFA9n0xhbAxL/FPKuTIi2cAkrGgGx6o2E6HXbuQbc7rS/RMKJBUfaEKS7MU2gSxgePnr76p+vxvtNXLooNGqRMg0IBJd1CMgbQDGeHaOC1MqPrNmfRANL3spST0lk4T7cgPoI6saNqCAMH7p++/G+ZqdiIbe0j0fbZJ9XEextFsgJkY3ttb5bU2Vkyo8qkIN+1/NWM4JtDO29vt2mCmO60PanAq+LFbmZ+2tFd+uyhj7HoUyJiHypxI8kXVpIEVJIEVJIEVJIEVOItYF3LGHHdiryPzZh7fudYi+i4s2qiBfk7Or18QlPGB69lTO1ptbKQth6Gz0J6YXLohG30cXhg/diTIkhIGaGbZePjH12d97EtFbCxhG5x5Uq8kVAhBBGjZcxcSBkb45ofmVkZ9zEtdOWuHyVoQjzhsWVefRMVEyyeQDTma1oooJzDQJMQXjx/aJfz3Acxj6LHcAooJ4DqOMRSRqfdfRJ9hHMWluNT2ALywEAf4RyBRWfPJKFbt6m07J68qL/WplGNzbPhJaE7elNpENuFqG1NOUoAFfQytglx+8Jh5zA2Yze2CbFZ+ltCl/kkGkA8GF/bvhJQ3KuQzsWSZdm8r21fCSiIb5uLaN0tVIy4fSF+sNB3Am74wwHuli/i9hljxkLK9JWAEpIKDSaEIvXLj+Rr31eL1tDREUuIz91XI7CxYELA5yGF9JUkAZUkAZXEJZmD/oCCiChOzxIlYJf4K6viF4ikk9Hr2CZEv8Jyx4BhyEj0Pr2+fukEEd/cWF6TeCw1LLrXcQqYX8TlCPht3G4RqMH6pRPFxdiZVibBhFaNYvzfBH830f0Kr6L04q06kPw8VIhsT4YGINY32X1wCihXwMktZmgYSW50PRMnX5x9L0HsKBJb+XcjAOFZJiQ7oe8uH+s1Cmfh/NYy4gk0gCR095t4QukyRu7Pkyvg6nqd5RyG7PL53h3YawTNo714BehWk5LMlSRfWEkSUEkSUEkSUEkSUMl/AAAA//+aRzURAAAABklEQVQDAMp7LdfPq/8lAAAAAElFTkSuQmCC" width="20" height="20" alt="QR code generator icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
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
                        <img src="data:image/png;base64,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" width="20" height="20" alt="Team management icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
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
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAEnElEQVR4nOzcPWsUQRjA8Wf2EoxBsPITBCzsJAgWJrkg5BPYKYJgXsTCwsoqSWVjLyaChYVgJVgINnkDwUI7BQPprLSVaNDbcZ54T7ib7N7N7DNvkfmDxGTv9vZ+7st4u5sRyLEagRyrDMgsWcCN22PtlhDLUogt/H5mbX8FEkxAYhEcCNHu/bkEWMWvqUEmA1gHp5caZHRAUzi9VCCjATaF04sNGRzQFZxeLMhggL7g9EJDegcMBacXCtIb4Mbi6WsFiPtCwmWImG9I54Dbi2NXpSweqhlfAtuk3MSBs3ructXkTlnOFkXRrps+cNaeIJ0BsjZVBdeRcnX26a/Nw/kUxUbVwxAQH4N/31oYX0kBkv1fOVdwYFkXYMUWkh6rntc7n8Y1BuQdHOSe+vNWtOBl62DkEzCKDWm9CbuAkyD2en9aFPKDVJDTz358N92E6wq9aRsD+oDTO4T8U5yFAl5VTTcBpEJBDgVkjuM+ApTvh8H1L5CcUJR3qqbZAFK+IWsBXR0cduZPnVcvMtERxQWTp7oGpHxBHgP0dVQ1hfQFSHEgy7Lc1F//GOD2wrgE67mbD0eGQQ4CVNPuyd+tF3iwAWZNIfV/RMGaKWMcVwc5CFDtTx/j/rT3qA3MbN+zDth8IK3wptd/zkLDptYPdtWXXQW5Z7OPxMpSTMJoZ3JnaYwNifs2HAuaIh7u3gA26fs+QCHljNr3gVFqH4mbO+4bOKN5HbIUYsL0uVzIpptxb31a2/OnN5p+7MSFPFqGxbEbIIvn1VP/bcJ1zzXdtFlw2pZXgKNwgXCNxIUDRp0OfIWG4RopRzs31RrZ3r515pw+HZcNl5G71vXm/LxwF3LZ1RrZJH3TlqPlXZdovTlbA/VcrZFaVmtnWRYPYLT85gsPMwacXtsXNCq3ySVkp4R3hSxft2T5efAjxZwA8Ui99hxYhu8R36vp463WQNwkY0PiUfvK+sGbakg+nO1up9EmnBqkGnldDA1HsfaBsSHxuVK0voAU18EyLhzl5CASGpIzHHEFRxkPpG12rNyBau1gftC0IanleTK1tr9k+vjaD1V8DaR746yRA4Ea4NEaZ4Nnk7dxIMaCZOZ6U63LKyAVEjIUHBUEkPIJGRqOCgpIuYSMBUdFAaQ4kLHhqKiAlA1kKnBUEoAUouA5h7rpOC21q/TzjTbMMiCzDMgsAzLLgMwyILMMyCwDMsuAzDIgswzILANWhFfpmj7W+MMED5dpJBfC4Ym1utssqrL6NMbT9S7R64Mb9isHur8Eg+oDxMt1waD/BdIGri6hz9Bm9aVcX8pWdV7Z5Wtw7kTQz49Xnizn3Arg6k0eLQOeTFdxrsemfNzCUXu1AW2esSFd5POO0qGXa5xkyBC34lpd79J9QvKQIe9hNgakUoaMcfO3NSCVEmSsu+axxoBUTMiYcBQbkAoJmQIc5QyQ8gmZEhzlHJByCZkiHOUNkOJCdm+AbINtnuEo74AUB9KqQHBUMEDKG2RgOCo4IOUMMhIcFQ2QagwZGY6KDkgZQyYCRyUDSNVCJgZHJQdIHUGqYUyKcFSygCelfF6YWQZk9hcAAP//h/x6UQAAAAZJREFUAwB3eujwMvaVNQAAAABJRU5ErkJggg==" width="20" height="20" alt="3D augmented reality icon" class="icon-img" style="display:block;border:0;outline:0;margin:0 auto;width:20px;height:20px;max-width:20px;max-height:20px;">
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
        <a href="mailto:\${email}" style="color:#c8955a;text-decoration:none;font-family:Arial,sans-serif;">\${email}</a>.
        If you didn't expect this, you can safely ignore it.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#3e2810;letter-spacing:0.04em;">
        &copy; \${new Date().getFullYear()} Aroma AR &middot; All rights reserved
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
</html>\`;
