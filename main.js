const {Client, Intents, MessageEmbed, APIMessage} = require('discord.js');
const axios = require('axios')

module.exports = class DiscordBotUtils {
    #client
    #guildId;
    #token;

    constructor(intents, token, guildId) {
        this.#client = new Client({ws: {intents: intents}});
        this.#guildId = guildId;
        this.#token = token;
    }

    getClient() {
        return this.#client;
    }

    // PRIVATE //

    async mpUser(user_id, message) {
        let channel = await axios.post("https://discord.com/api/v8/users/@me/channels", {
            recipient_id: user_id
        }, {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch((error) => console.error(error))
        await this.replyOnChannel(channel.data.id, message)

    }

    // PRIVATE //


    // CHANNEL //

    async replyOnChannel(channel_id, response) {
        let data = {content: response}

        if (typeof response === 'object') {
            data = {embeds:[response]}
        }

        return await axios.post("https://discord.com/api/v8/channels/" + channel_id + "/messages", data,
            {
                headers: {
                    Authorization: 'Bot ' + this.#token
                }
            }).catch((error) => console.error(error))
    }

    async getChannelMessages(channel_id) {
        return await axios.get("https://discord.com/api/v8/channels/" + channel_id + "/messages", {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch((error) => console.error(error))
    }

    async deleteChannelMessage(channel_id, message_id) {
        return await axios.delete("https://discord.com/api/v8/channels/" + channel_id + "/messages/" + message_id, {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch(async (error) => {
            await this.sleep(error.response.data.retry_after * 1000);
            await this.deleteChannelMessage(channel_id, message_id)
        })
    }

    // CHANNEL //

    // GUILD //

    async getRole(role_id,guildId) {
        let roles = await axios.get("https://discord.com/api/v8/guilds/" + guildId + "/roles", {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch((error) => console.error(error))
        for (let role of roles.data) {
            if (role.id == role_id) return role;
        }
    }

    async getGuildMember(guild_id, user_id) {
        return await axios.get("https://discord.com/api/v8/guilds/" + guild_id + "/members/" + user_id, {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch((error) => {
            return this.getGuildMember(guild_id, user_id)
        })
    }

    // GUILD //

    // REACTIONS //

    /**
     * Send the given emoji on the message_id located on the channel_id
     * @param channel_id the id of the channel where the message is
     * @param message_id the id of the message where to add the reaction
     * @param emoji the emoji to add
     * @returns {Promise<AxiosResponse<any>|void>}
     */
    async sendReaction(channel_id, message_id, emoji) {
        await this.sleep(100);
        return await axios.put("https://discord.com/api/v8/channels/" + channel_id + "/messages/" + message_id + "/reactions/" + emoji + "/@me", {}, {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch(() => console.error("Too fast"))
    }

    /**
     * Delete all reactions on a given message
     * @param channel_id the id of the channel where the message is
     * @param message_id the id of the message where to remove the reactions
     * @returns {Promise<AxiosResponse<any>|void>}
     */
    async deleteAllReactions(channel_id, message_id) {
        await this.sleep(100);
        return await axios.delete("https://discord.com/api/v8/channels/" + channel_id + "/messages/" + message_id + "/reactions", {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch(() => {
            console.error("Too Fast")
        })
    }

    /**
     * Delete all reactions for a emoji on a given message
     * @param channel_id the channel id where the message is
     * @param message_id the message id where the reaction is
     * @param emoji the emoji to remove from reactions
     * @returns {Promise<AxiosResponse<any>|void>}
     */
    async deleteReactionsForEmoji(channel_id, message_id, emoji) {
        await this.sleep(100);
        return await axios.delete("https://discord.com/api/v8/channels/" + channel_id + "/messages/" + message_id + "/reactions/" + emoji, {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch(() => {
            this.deleteReactionsForEmoji(channel_id, message_id, emoji)
        })
    }

    // REACTIONS //

    // INTERACTION //

    async getCommands(){
        return this.getApp(this.#guildId).commands.get();
    }

    async deleteCommand(commandId){
        await this.getApp(this.#guildId).commands(commandId).delete();
    }

    async setupCommand(commandJSON) {
        let command = await this.getApp(this.#guildId).commands.post(commandJSON).catch((error) => console.error(error))
        await this.editCommandPerms(command.id)
    }

    async editCommandPerms(command_id, adminRole) {
        let link;
        if (this.#guildId) {
            link = "https://discord.com/api/v8/applications/" + this.#client.user.id + "/guilds/" + this.#guildId + "/commands/" + command_id + "/permissions"
        } else {
            link = "https://discord.com/api/v8/applications/" + this.#client.user.id + "/commands/" + command_id + "/permissions"
        }
        return await axios.put(link, {
            permissions: [
                {
                    id: adminRole,
                    type: 1,
                    permission: true
                }
            ]
        }, {
            headers: {
                Authorization: 'Bot ' + this.#token
            }
        }).catch((error) => console.error(error))
    }

    /**
     * Reply a message to a command, cant be an object or a string
     * @param interaction the interaction the respond to
     * @param response the response can be a string or a embed
     * @returns {Promise<void>}
     */
    async replyToInteraction(interaction, response) {
        let data = {content: response}

        if (typeof response === 'object') {
            data = {embeds:[response]}
        }

        await this.#client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: 4,
                data: data
            }
        })
    }

    /**
     * Reply the original message for a given interaction
     * @param interaction
     * @returns {Promise<AxiosResponse<any>|void>}
     */
    async getInteractionMessage(interaction) {
        return await axios.get("https://discord.com/api/v8/webhooks/" + interaction.application_id + "/" + interaction.token + "/messages/@original").catch(() => console.error("Too Fast"))
    }

    /**
     * Edit the original message of a given interaction
     * @param interaction the interaction to edit
     * @param newMessage the new message to
     * @returns {Promise<AxiosResponse<any>|void>}
     */
    async editInteractionMessage(interaction, newMessage) {
        let data = {content: newMessage}

        if (typeof newMessage === 'object') {
            data = {embeds:[newMessage]}

        }
        return await axios.patch("https://discord.com/api/v8/webhooks/839549782816718848/" + interaction.token + "/messages/@original", data).catch(() => console.error("Too Fast"))
    }

    // INTERACTION //

    // UTILS //

    /**
     * Sleep for a given time
     * @param ms the time to sleep
     * @returns {Promise<unknown>}
     */
    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    /**
     * Return the app for a given guild or global if no guild is specified
     * @param guildId the guildId or nothing
     * @returns {*} the app
     */
    getApp(guildId) {
        const app = this.#client.api.applications(this.#client.user.id)
        if (this.#guildId) {
            app.guilds(this.#guildId);
        }
        return app
    }


    // UTILS //
}