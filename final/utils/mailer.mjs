import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});

export const sendMagicLink = (receiver, token) => {
  const mailOptions = {
    from: process.env.ZOHO_USER,
    to: receiver,
    subject: "New signup request via magic link",
    text: `We recieved a request from this email for sign up. Please, continue with this link: https://www.mywebsite.com/sigup?token=${token}\nNote: Link expires in 24 hours.`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
