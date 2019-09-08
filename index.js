const { VK } = require('vk-io');
const bot = new VK({
    token: 'b069ed89d72a85c13ffb58deb4072f9504d1b6b94f1ef66004e54903f031f5be78a1030610664f24b220f'
});

const fs = require('fs');

let database = {}; // keys=peer_ids, values={ key=message, value=attachment }

if (fs.existsSync('db.json')) {
    database = JSON.parse(fs.readFileSync('db.json'));

    const chatCount = Object.values(database).length;

    console.log(`[BOT] База данных загружена успешно! Бесед: ${chatCount}`);
}

bot.updates.on('new_message', async (ctx) => {
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

    //console.log('database[ctx.peerId]', database[ctx.peerId])
    //console.log('database[ctx.peerId].zip()', database[ctx.peerId].zip())
    //console.log('database[ctx.peerId].zip().value', database[ctx.peerId].zip().value)

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

        //await ctx.send(`Фотография успешно загружена!`)
        await ctx.send(`Фотографи${atts.length === 1 ? 'я' : 'и'} успешно загружен${atts.length === 1 ? 'а' : 'ы'}!`)
    //} else if (ctx.text in database[ctx.peerId]) {
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
            await ctx.send(`Фотографи${found.length === 1 ? 'я' : 'и'} успешно загружен${found.length === 1 ? 'а' : 'ы'}!`)
        }

        updateDatabase();

        //await ctx.send(`Фотография успешно загружена!`)
    //} else if (ctx.text in database[ctx.peerId]) {
    } else if (ctx.text === '/команды') {
        const cmds = [
            '/добавить <название> -- добавить картинку(картинки) в данную беседу',
            '/удалить <название> -- удалить картинку(картинки) из данной беседы',
            '/очистить -- удаляет все картинки из указанной беседы. Только для администратора бота.',
            '/список -- выводит список всех картинок в данной беседе.',
            '/команды -- покажет эту справку.',
            '',
            'Если ввести что-то помимо того, что указано выше, бот попытается воспринять это как название картинки:',
            '<название> -- получить указанную картинку',
            'Названия указываются без слеша (символ "/").',
            '',
            'Пример команд:',
            '@picture__bot /добавить НАЗВАНИЕ -- добавит прикрепленную(ые) картинку(и) под названием НАЗВАНИЕ.',
            '@picture__bot НАЗВАНИЕ -- покажет прикрепленную(ые) командой выше картинку(и).',
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
    } else if (ctx.text === '/список') {
        let list = Object.entries(database[ctx.peerId]).map(triggers => '    ⚫ ' + triggers[0] + ': ' + triggers[1].length + ' элемента(ов)').join('\n');

        if (list.trim().length < 1) list = 'список пуст';
        else list = '\n' + list;

        await ctx.send('Список картинок в данной беседе (это регулярные выражения): ' + list);
    } else {
        // let found = false;

        // for (triggerRegex in database[ctx.peerId]) {
        //     let triggerValue = database[ctx.peerId][triggerRegex];

        //     if (RegExp(triggerRegex).test(ctx.text)) {
        //         await ctx.mySendPhoto(triggerValue, {
        //             peer_id: ctx.peerId
        //         });
        //         found = true;
        //         break;
        //     }
        // }

        let found = findByRegex(ctx.peerId, ctx.text);

        if (found === null) {
            //await ctx.send('Такой картинки/команды нет!');
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

        if (RegExp(triggerRegex).test(query)) {
            return triggerValue;
        }
    }

    return null; // if nothing found
}

function deleteByQuery(peerId, query) {
    for (triggerRegex in database[peerId]) {
        let triggerValue = database[peerId][triggerRegex];

        if (RegExp(triggerRegex).test(query)) {
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