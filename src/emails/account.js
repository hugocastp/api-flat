const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, fname, lname) => {
    sgMail.send({
        to: email,
        from: 'monoplatito@gmail.com',
        subject: 'Welcome to Free Language Annotation Tool',
        text: `Welcome to the app, ${fname}  ${lname}. Let me know how you get along with the app.`
    })
}

const sendCancelEmail = (email, fname, lname) => {
    sgMail.send({
        to: email,
        from: 'monoplatito@gmail.com',
        subject: 'Cancelation to Free Image Annotation Tool',
        text: `Hello, ${fname}  ${lname}. Let us know if there is something we could've done to keep you.`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancelEmail
}