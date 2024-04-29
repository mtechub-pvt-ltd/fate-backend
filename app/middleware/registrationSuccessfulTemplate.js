const nodemailer = require('nodemailer');

const logo = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704949686/fate_logo_xkofni.png";
const twitter = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704950697/twitter_wq70nt.png"
const fb = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704950627/fb_dpqlnq.png"
const insta = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704950662/insta_s6c64d.png"

const sendConfirmationEmail = async (email) => {
    // Replace the following with your email configuration (SMTP settings)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'testing.mtechub@gmail.com',
            pass: 'tvryoonxpxgsuzdg',
        },
    });

    const mailOptions = {
        from: 'testing.mtechub@gmail.com',
        to: email,
        subject: 'Registration Successfull',
        // text: 'Thank you for signing up! Your account has been successfully created.'
        html: `
            <html>
            <head>
                <style>
                    /* Add your CSS styles for the email template here */
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        color: #333;
                        margin: 0;
                        padding: 0;
                    }
                    .header {
                        background-color: #ce4bb5; /* Yellow background color */
                        padding: 10px;
                        text-align: center;
                        border-radius: 5px;
                    }
                    .logo-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        align-content:center;
                        margin-bottom: 10px;
                    }
                    .logo {
                        margin-top:-40vh;
                        display: inline-block;
                        margin: 0 5px; /* Adjust spacing between icons */
                        max-width: 150px; /* Adjust size as needed */
                    } 
                    .container {
                        max-width: 700px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        text-align: center;
                    }
                    .centered-image {
                        display: inline-block;
                        margin: 0 5px; /* Adjust spacing between icons */
                        max-width: 30px; /* Adjust size as needed */
                    }  
                </style>
            </head>
            <body>

                <div class="container">

                <img class="logo" src="${logo}" alt="Logo"> 

                    <!-- Second Image -->
                    <p style="color: black; text-align: center; font-weight:bold; font-size:20px;">
                    Start Your Love Story Today!
                    </p> 
                    <!-- Rest of your email content --> 
                    <p style="color: #606060; text-align: left; margin: 15px 0;">
                    Welcome aboard! We are delighted to have you join Fate, where your journey towards your LOVER begins. It's more than just a platform; it's a community, and you are now an integral part of it.

                    <p style="color: #606060; text-align: left; margin: 15px 0;">
                   Add pics and write a fun bio to increase your chances for a perfect match.
                    </p>

                    <p style="color: #606060; text-align: left; margin: 15px 0;">
                    Thank you for choosing Fate. We're excited to be part of your love story, and we look forward to helping you achieve your perfect match.
                     </p>

                    <div class="header"> 
                    <p style="color: white; text-align: center; font-weight:bold; font-size:20px;">
                        Get In Touch!
                    </p>
                    <a href="https://www.facebook.com/link-to-facebook" target="_blank">
                        <img src="${fb}" alt="Facebook" class="centered-image">
                    </a>
                    <a href="https://www.instagram.com/link-to-instagram" target="_blank">
                        <img src="${insta}" alt="Instagram" class="centered-image">
                    </a>
                    <a href="https://www.twitter.com/link-to-twitter" target="_blank">
                        <img src="${twitter}" alt="Twitter" class="centered-image">  
                    </a>

                    <!-- Add a copyright symbol -->
                    <p style="color: white; text-align: center; font-weight:boldest; font-size:13px;">
                        &#169; 2024 Fate. All right reserved
                    </p>
                </div>

                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Signup confirmation email sent successfully.');
    } catch (error) {
        console.error('Error sending signup confirmation email:', error);
    }
};

module.exports = { sendConfirmationEmail };