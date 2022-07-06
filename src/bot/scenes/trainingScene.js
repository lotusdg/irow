const {
  Scenes: { BaseScene },
} = require('telegraf');
const Word = require('../../db/models/word');
const agenda = require('../../agenda/initAgenda');
const Training = require('../../db/models/training');

const trainingScene = new BaseScene('trainingScene');

trainingScene.enter(async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    ctx.session.trainingDoc = await Training.findOne({
      userId,
      status: 'ACT',
    }).exec();
    if (!ctx.session.trainingDoc) {
      ctx.reply('Your dictionary is empty.\nPlease add /words!');
      return (ctx.session.exit = true);
    } else {
      ctx.session.exit = false;
      ctx.session.word = await Word.findById({
        _id: ctx.session.trainingDoc.wordId,
      });
      ctx.reply(
        `Enter the translation (in Ukrainian)!\nWord: ${ctx.session.word.text}`,
      );
    }
  } catch (err) {
    console.error(err);
    ctx.reply({ error: err.message || err });
    ctx.session.exit = true;
    return ctx.scene.leave();
  }
});

trainingScene.on('text', async (ctx) => {
  if (ctx.session.exit) {
    return ctx.scene.leave();
  }
  let thisWordStage = ctx.session.word.stage;
  const translate = ctx.message.text.toLowerCase();
  let reply;
  if (translate === ctx.session.word.translate) {
    reply = 'Correct!';
    if (thisWordStage < 7) {
      thisWordStage += 1;
      await Word.updateOne(
        {
          _id: ctx.session.word._id,
        },
        { stage: thisWordStage },
      );
    } else {
      thisWordStage = 8;
      await Word.updateOne(
        {
          _id: ctx.session.word._id,
        },
        { status: 'Complete', stage: thisWordStage },
      );
    }
  } else {
    reply = `Incorrect!\nAnswer: ${ctx.session.word.translate}`;
  }
  reply += '\nNext repeating this word after ';
  const currentDate = new Date();
  let date;
  switch (thisWordStage) {
    case 2:
      ctx.reply(reply + '3 hours');
      date = currentDate.setHours(currentDate.getHours() + 3);
      agenda.schedule(date, 'sendMessage', {
        to: ctx.message.from.id,
        wordId: ctx.session.word._id,
      });
      break;
    case 3:
      ctx.reply(reply + '1 day');
      date = currentDate.setHours(currentDate.getHours() + 24);
      agenda.schedule(date, 'sendMessage', {
        to: ctx.message.from.id,
        wordId: ctx.session.word._id,
      });
      break;
    case 4:
      ctx.reply(reply + '5 days');
      date = currentDate.setHours(currentDate.getHours() + 120);
      agenda.schedule(date, 'sendMessage', {
        to: ctx.message.from.id,
        wordId: ctx.session.word._id,
      });
      break;
    case 5:
      ctx.reply(reply + '25 days');
      date = currentDate.setHours(currentDate.getHours() + 600);
      agenda.schedule(date, 'sendMessage', {
        to: ctx.message.from.id,
        wordId: ctx.session.word._id,
      });
      break;
    case 6:
      ctx.reply(reply + '3 month');
      date = currentDate.setHours(currentDate.getHours() + 2160);
      agenda.schedule(date, 'sendMessage', {
        to: ctx.message.from.id,
        wordId: ctx.session.word._id,
      });
      break;
    case 7:
      ctx.reply(reply + '1 year');
      date = currentDate.setHours(currentDate.getHours() + 8760);
      agenda.schedule(date, 'sendMessage', {
        to: ctx.message.from.id,
        wordId: ctx.session.word._id,
      });
      break;
    case 8:
      ctx.reply('Congratulations! You learned this word.');
      break;
    default:
      console.error('Something went wrong with the stages');
      ctx.reply('Error: Something went wrong with the stages!');
  }
  await Training.updateOne(
    { _id: ctx.session.trainingDoc._id },
    { status: 'CMP' },
  );
  return ctx.scene.reenter();
});

module.exports = { trainingScene };
