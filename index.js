const { VK } = require('vk-io');
const bot = new VK({
    token: 'нет токена'
});

const fs = require('fs');

let users = {}; // keys=user_ids, values=booleans

let database = {}; // keys=peer_ids, values={ key=message, value=attachment }

if (fs.existsSync('./db.json')) {
    console.log(fs.readFileSync('./db.json').toString('utf8'));
    database = JSON.parse(fs.readFileSync('./db.json').toString('utf8'));

    const chatCount = Object.values(database).length;

    console.log(`[BOT] База данных загружена успешно! Бесед: ${chatCount}`);
}

bot.updates.on('new_message', async (ctx) => {
    if (ctx.isOutbox || ctx.isGroup || ctx.text === null) return;

    console.log('[NEW MESSAGE] ' + ctx.text);
    ctx.text = ctx.text.trim();

    ctx.mySendPhoto = async(sources, params = {}) => {
        if (!Array.isArray(sources)) {
            sources = [sources];
        }
        
        const attachment = await Promise.all(
            sources.map((source) => {
                return bot.upload.messagePhoto({ source, peer_id: ctx.peerId });
            })
        );
        
        ctx.send(Object.assign(params, {
            attachment
        }));
    };

    if (ctx.text.startsWith('[club186313414|@picture__bot]')) {
        ctx.text = ctx.text.substring('[club186313414|@picture__bot]'.length).trim();
    }

    if (!database[ctx.peerId]) database[ctx.peerId] = {};
    if (users[ctx.senderId] === undefined) users[ctx.senderId] = false;

    if (ctx.text.startsWith('/добавить')) {
        let name = ctx.text.substring('/добавить'.length + 1).trim();

        if (name.length < 1) {
            await ctx.send('Необходимо ввести название добавляемой фотографии!');
            return;
        }

        const atts = ctx.getAttachments('photo');

        if (atts.length < 1) {
            await ctx.send('Необходимо залить хотя бы одну фотографию!');
            return;
        }

        database[ctx.peerId][name] = atts.map(x => x.largePhoto);
        updateDatabase();
        await ctx.send(`Фотографи${atts.length === 1 ? 'я' : 'и'} успешно загружен${atts.length === 1 ? 'а' : 'ы'}!`)
    } else if (ctx.text.startsWith('/удалить')) {
        let name = ctx.text.substring('/удалить'.length + 1).trim();

        if (name.length < 1) {
            await ctx.send('Необходимо ввести название удаляемой фотографии!');
            return;
        }

        let found = findByRegex(ctx.peerId, ctx.text);

        if (found === null) {
            await ctx.send('Такая картинка отсутствует!');
            return;
        }

        if (deleteByQuery(ctx.peerId, ctx.text)) {
            await ctx.send(`Фотографи${found.length === 1 ? 'я' : 'и'} успешно удален${found.length === 1 ? 'а' : 'ы'}!`)
        }

        updateDatabase();
    } else if (ctx.text === '/команды') {
        const cmds = [
            '/добавить <название> -- добавить картинку(картинки) в данную беседу',
            '/удалить <название> -- удалить картинку(картинки) из данной беседы',
            '/очистить -- удаляет все картинки из указанной беседы. Только для администратора бота.',
            '/список -- выводит список всех картинок в данной беседе.',
            '/команды -- покажет эту справку.',
            '/гм -- переключит гм. При включенном гм у вас будет возможность писать без команды //.',
            '',
            'Если ввести что-то помимо того, что указано выше, бот попытается воспринять это как название картинки:',
            '<название> -- получить указанную картинку',
            'Названия указываются без слеша (символ "/").',
            '',
            'Пример команд:',
            '/добавить НАЗВАНИЕ -- добавит прикрепленную(ые) картинку(и) под названием НАЗВАНИЕ.',
            '@picture__bot НАЗВАНИЕ -- покажет прикрепленную(ые) командой выше картинку(и). Работает только с гм.',
            '// НАЗВАНИЕ -- покажет прикрепленную(ые) командой выше картинку(и). Работает только с гм и без него.',
            'Чтобы избавиться от необходимости писать @picture__bot, как в примере выше, дайте боту право читать все сообщения.',
        ]

        await ctx.send('Команды бота:\n' + cmds.map(x => x.length === 0 ? x : '    ⚫ ' + x).join('\n'));
    } else if (ctx.text === '/очистить') {
        if (ctx.senderId !== 150013768) {
            await ctx.send('Очищать картинки может только администратор бота!');
            return;
        }

        database[ctx.peerId] = {};
        updateDatabase();

        await ctx.send('Картинки в текущей беседе успешно очищены!');
    } else if (ctx.text === '/гм') {
	users[ctx.senderId] = !users[ctx.senderId];

        await ctx.send('Гейммод ' + users[ctx.senderId] ? 'включен!' : 'выключен!');
    } else if (ctx.text === '/ping') {
        if (ctx.senderId !== 150013768) {
            await ctx.send('Пинговать может только администратор бота!');
            return;
        }

	let date_1x_users_get = Date.now();
	await bot.api.users.get({ user_ids: [150013768] });
	let elapsed_1x_users_get = Date.now() - date_1x_users_get;

	/*let date_10x_users_get = Date.now();
	for (let i = 0; i < 10; i++) {
		await bot.api.users.get({ user_ids: [150013768] });
	}
	let elapsed_10x_users_get = Date.now() - date_10x_users_get;*/

        await ctx.send(`Ping:\n1x users.get: ${elapsed_1x_users_get}ms`);
    } else if (ctx.text.startsWith('/жс')) {
        if (ctx.senderId !== 150013768) {
            await ctx.send('Доступ к консоли имеет только администратор бота!');
            return;
        }

	if (ctx.text.length === 3) {
            await ctx.send('Введите код!');
            return;
	}

	let code = ctx.text.substring(4);
	let result = await eval(code);

	let type = typeof(result);

	await ctx.send(`${type}: ${result}`);
    } else if (ctx.text === '/список') {
        let list = Object.entries(database[ctx.peerId]).map(triggers => '    ⚫ ' + triggers[0] + ': ' + triggers[1].length + ' элемента(ов)').join('\n');

        if (list.trim().length < 1) list = 'список пуст';
        else list = '\n' + list;

        await ctx.send('Список картинок в данной беседе (это регулярные выражения): ' + list);
    } else {
        if (ctx.text.startsWith('// ')) {
            ctx.text = ctx.text.substring(3);
        }

        let found = findByRegex(ctx.peerId, ctx.text);

        if (found === null) {
            return;
        }

        await ctx.mySendPhoto(found, {
            peer_id: ctx.peerId
        });
    }
});

console.log('[BOT] Бот запущен!');

bot.updates.start();

function findByRegex(peerId, query) {
    for (triggerRegex in database[peerId]) {
        let triggerValue = database[peerId][triggerRegex];

        if (RegExp(triggerRegex, 'i').test(query)) {
            return triggerValue;
        }
    }

    return null; // if nothing found
}

function deleteByQuery(peerId, query) {
    for (triggerRegex in database[peerId]) {
        if (RegExp(triggerRegex, 'i').test(query)) {
            delete database[peerId][triggerRegex];
            return true; // if found return true
        }
    }

    return false; // if not found return false
}

function updateDatabase() {
    fs.writeFileSync('db.json', JSON.stringify(database));
    console.log('[BOT] Saved the database!');
}
