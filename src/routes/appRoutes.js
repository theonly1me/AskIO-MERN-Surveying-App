const express = require('express');
const stripe = require('stripe')(process.env.SECRET_KEY);
const Survey = require('../models/surveyModel');
const Mailer = require('../services/sendgrid');
const surveyTemplate = require('../services/templates/template');

//App Router
const router = express.Router();

//Middlewares
const validateUser = (req, res, next) => {
  if (!req.user) res.status(401).send('Unauthorized!');
  next();
};

const hasCredits = (req, res, next) => {
  if (req.user.credits < 1)
    res
      .status(403)
      .send(
        'Not enough credits! Please add more credits before creating a survey!'
      );
  next();
};
//CatchAsync error handling for async
const catchAsync = fn => (req, res, next) => fn(req, res, next).catch(next);

router.route('/user').get((req, res) => {
  const { user } = req;
  // let status = 'fail';
  // if (user) status = 'success';
  res.status(200).json({ data: user });
});

router.route('/logout').get((req, res) => {
  req.logout();
  res
    .status(200)
    .json({ status: 'success', message: 'Logged out successfully' });
});

router.get('/surveys/thanks', (req, res) => {
  res.status(200).send('Thanks for your feedback, it means a lot to us!');
});

router.post(
  '/payments',
  validateUser,
  catchAsync(async (req, res) => {
    try {
      const {
        body: { id: source },
      } = req;
      const charge = await stripe.charges.create({
        source,
        currency: 'usd',
        amount: 500,
        description: 'Add 50 credits to AskIO account',
      });
      req.user.credits += 50;
      const user = await req.user.save();
      res.status(200).json({ data: user });
    } catch (ex) {
      console.error('An error occured: ', ex);
    }
  })
);

router.post(
  '/surveys',
  validateUser,
  hasCredits,
  catchAsync(async (req, res) => {
    const { title, subject, body, recipients } = req.body;
    const survey = await Survey.create({
      title,
      subject,
      body,
      recipients: recipients.split(',').map(email => ({
        email: email.trim(),
      })),
      _user: req.user.id,
      dateSent: Date.now(),
    });
    const mailer = new Mailer(survey, surveyTemplate(survey));
    await mailer.send();
    await survey.save();
    req.user.credits -= recipients.split(',').length;
    const user = await req.user.save();
  })
);

module.exports = router;
