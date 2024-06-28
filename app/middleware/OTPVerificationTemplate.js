const nodemailer = require('nodemailer');

const emailverification = 'https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704952478/emailverification_axpvou.png'
const twitter = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704950697/twitter_wq70nt.png"
const fb = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704950627/fb_dpqlnq.png"
const insta = "https://res.cloudinary.com/dxfdrtxi3/image/upload/v1704950662/insta_s6c64d.png"

const OTPVerificationEmail = async (email, otp) => {
    // Replace the following with your email configuration (SMTP settings)

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mtechub.info@gmail.com',
            pass: 'qhsplxpbfyasghpa',
        },
    });

    const mailOptions = {
        from: 'mtechub.info@gmail.com',
        to: email,
        subject: 'Password Reset OTP',
        // text: `Your OTP for password reset is: ${otp}`,
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
                    background-color:#CE4BB5; /* Yellow background color */
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
                    display: inline-block;
                    margin: 0 5px; /* Adjust spacing between icons */
                    max-width: 100px;
                } 
                .container {
                    max-width: 600px;
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
                .otp {
                    background-color: #CE4BB5; /* Yellow background color */
                    padding: 5px;
                    padding-left: 25px;
                    padding-right: 20px;
                    width: 100vh;
                    font-size: 20px;
                    text-align: center;
                    margin-top: 40px;
                    margin-bottom: 20px;
                    letter-spacing: 5px;
                    border-radius: 50px;
                    color: white;
                }
                /* Add more styles as needed */
            </style>
        </head>
        <body> 
            <div class="container">
                <!-- Second Image --> 
                <img src="${emailverification}" alt="Embedded Image" style="border-radius:5px; width: 100%; margin-top:20px; height:230px">

                <p style="color: #606060; margin: 15px 0;">
                Great choice on joining Fate ! To get the most out of your experience, please enter this code in the designated field on our platform. If you did not initiate this request, please disregard this email.
                </p>

                <strong class="otp">${otp}</strong>       

                <p style="color: #606060; margin: 10px 0;">
                No worries if you didn't request this - just ignore the email, and your account will stay inactive.
                </p>

                  <p style="color: #606060; margin: 10px 0;">
                  Looking forward to having you on board!
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

module.exports = { OTPVerificationEmail };