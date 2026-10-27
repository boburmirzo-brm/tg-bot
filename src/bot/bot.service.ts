import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard, Keyboard } from 'grammy';

// Asosiy menyu tugmalarining matnlari
const BTN = {
  info: "ℹ️ Ma'lumot",
  random: '🎲 Tasodifiy son',
  settings: '⚙️ Sozlamalar',
  contact: '📞 Aloqa',
} as const;

// Pastda doimiy turadigan menyu (reply keyboard)
const mainMenu = new Keyboard()
  .text(BTN.info)
  .text(BTN.random)
  .row()
  .text(BTN.settings)
  .text(BTN.contact)
  .resized();

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Bot;

  constructor(config: ConfigService) {
    this.bot = new Bot(config.getOrThrow<string>('BOT_TOKEN'));
    this.registerHandlers();
  }

  private registerHandlers() {
    // /start buyrug'i — salomlashib, asosiy menyuni ko'rsatadi
    this.bot.command('start', (ctx) =>
      ctx.reply(
        `Salom, ${ctx.from?.first_name ?? "do'stim"}! 👋\n` +
          "Men oddiy o'quv botman. Quyidagi menyudan tanlang:",
        { reply_markup: mainMenu },
      ),
    );

    // /menu buyrug'i — menyuni qayta chiqaradi
    this.bot.command('menu', (ctx) =>
      ctx.reply('Asosiy menyu:', { reply_markup: mainMenu }),
    );

    // /help buyrug'i
    this.bot.command('help', (ctx) =>
      ctx.reply(
        'Mavjud buyruqlar:\n' +
          '/start — botni boshlash\n' +
          '/menu — asosiy menyu\n' +
          '/help — yordam\n\n' +
          'Boshqa har qanday matnni yuborsangiz, uni sizga qaytaraman.',
      ),
    );

    // --- Asosiy menyu tugmalari ---

    this.bot.hears(BTN.info, (ctx) =>
      ctx.reply(
        "Bu bot NestJS va grammy yordamida yozilgan o'quv loyihasi. 📚 va yangilandi",
      ),
    );

    this.bot.hears(BTN.random, (ctx) =>
      ctx.reply(`Sizning soningiz: ${this.randomNumber()}`, {
        reply_markup: new InlineKeyboard().text('🔄 Yana', 'random:again'),
      }),
    );

    this.bot.hears(BTN.settings, (ctx) =>
      ctx.reply('Tilni tanlang:', {
        reply_markup: new InlineKeyboard()
          .text("🇺🇿 O'zbekcha", 'lang:uz')
          .text('🇷🇺 Русский', 'lang:ru')
          .text('🇬🇧 English', 'lang:en'),
      }),
    );

    this.bot.hears(BTN.contact, (ctx) =>
      ctx.reply("Biz bilan bog'lanish:", {
        reply_markup: new InlineKeyboard().url(
          '✈️ Telegram',
          'https://t.me/BotFather',
        ),
      }),
    );

    // --- Inline tugmalar bosilganda (callback query) ---

    this.bot.callbackQuery('random:again', async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(`Sizning soningiz: ${this.randomNumber()}`, {
        reply_markup: new InlineKeyboard().text('🔄 Yana', 'random:again'),
      });
    });

    this.bot.callbackQuery(/^lang:(uz|ru|en)$/, async (ctx) => {
      const names = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };
      const lang = ctx.match[1] as keyof typeof names;
      await ctx.answerCallbackQuery({ text: 'Saqlandi ✅' });
      await ctx.editMessageText(`Tanlangan til: ${names[lang]}`);
    });

    // Oddiy matnli xabarlar — echo (eng oxirida turishi kerak)
    this.bot.on('message:text', (ctx) =>
      ctx.reply(`Siz yozdingiz: ${ctx.message.text}`),
    );

    this.bot.catch((err) => this.logger.error(err.message, err.stack));
  }

  private randomNumber() {
    return Math.floor(Math.random() * 100) + 1;
  }

  async onModuleInit() {
    // Telegram'dagi "Menu" tugmasida ko'rinadigan buyruqlar
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Botni boshlash' },
      { command: 'menu', description: 'Asosiy menyu' },
      { command: 'help', description: 'Yordam' },
    ]);

    // start() promise faqat bot to'xtaganda tugaydi, shuning uchun await qilmaymiz
    void this.bot.start({
      onStart: (me) => this.logger.log(`Bot ishga tushdi: @${me.username}`),
    });
  }

  async onModuleDestroy() {
    await this.bot.stop();
  }
}
