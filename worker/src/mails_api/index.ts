import { Hono } from 'hono'

import parsed_mail_api from './parsed_mail_api';
import mails_crud from './mails_crud';
import new_address from './new_address';
import auto_reply from './auto_reply'
import webhook_settings from './webhook_settings';
import s3_attachment from './s3_attachment';
import address_auth from './address_auth';
import ai_advisor_api from './ai_advisor_api';
import api_token_api from './api_token_api';
import address_groups_api from './address_groups_api';

export const api = new Hono<HonoCustomType>()

// auto reply
api.get('/api/auto_reply', auto_reply.getAutoReply)
api.post('/api/auto_reply', auto_reply.saveAutoReply)

// webhook
api.get('/api/webhook/settings', webhook_settings.getWebhookSettings)
api.post('/api/webhook/settings', webhook_settings.saveWebhookSettings)
api.post('/api/webhook/test', webhook_settings.testWebhookSettings)

// attachment (S3)
api.get('/api/attachment/list', s3_attachment.list)
api.post('/api/attachment/delete', s3_attachment.deleteKey)
api.post('/api/attachment/put_url', s3_attachment.getSignedPutUrl)
api.post('/api/attachment/get_url', s3_attachment.getSignedGetUrl)

// mail crud
api.get('/api/mails', mails_crud.listMails)
api.get('/api/mail/:mail_id', mails_crud.getMail)
api.delete('/api/mails/:id', mails_crud.deleteMail)

// parsed mail (server-side parsed subject/text/html/attachments)
api.get('/api/parsed_mails', parsed_mail_api.listParsedMails)
api.get('/api/parsed_mail/:mail_id', parsed_mail_api.getParsedMail)

// address settings / lifecycle
api.get('/api/settings', mails_crud.getSettings)
api.post('/api/new_address', new_address.createNewAddress)
api.delete('/api/delete_address', mails_crud.deleteAddress)
api.delete('/api/clear_inbox', mails_crud.clearInbox)
api.delete('/api/clear_sent_items', mails_crud.clearSentItems)

// address auth
api.post('/api/address_change_password', address_auth.changePassword)
api.post('/api/address_login', address_auth.login)
api.get('/api/address_notes', address_groups_api.listNotes)
api.post('/api/address/:id/note', address_groups_api.saveNote)
api.get('/api/address_groups', address_groups_api.listGroups)
api.post('/api/address_groups', address_groups_api.createGroup)
api.post('/api/address_groups/:id', address_groups_api.renameGroup)
api.delete('/api/address_groups/:id', address_groups_api.deleteGroup)
api.get('/api/address_groups/:id/members', address_groups_api.listMembers)
api.post('/api/address_groups/:id/members', address_groups_api.addMembers)
api.delete('/api/address_groups/:id/members', address_groups_api.removeMembers)

api.get('/api/api_tokens/catalog', api_token_api.catalog)
api.get('/api/api_tokens', api_token_api.list)
api.post('/api/api_tokens', api_token_api.create)
api.delete('/api/api_tokens/:id', api_token_api.revoke)

api.get('/api/ai_advisor/auth', ai_advisor_api.getAuth)
api.post('/api/ai_advisor/auth', ai_advisor_api.saveAuth)
api.get('/api/ai_advisor/messages', ai_advisor_api.listMessages)
api.delete('/api/ai_advisor/messages', ai_advisor_api.clearMessages)
api.post('/api/ai_advisor/chat', ai_advisor_api.chat)
api.get('/api/ai_advisor/models', ai_advisor_api.listModels)
api.get('/api/ai_advisor/provider', ai_advisor_api.listModels)
api.post('/api/ai_advisor/provider', ai_advisor_api.saveProvider)
api.post('/api/ai_advisor/test', ai_advisor_api.testProvider)
