import { Context, Hono } from 'hono'

import address_api from './address_api'
import address_sender_api from './address_sender_api'
import sendbox_api from './sendbox_api'
import statistics_api from './statistics_api'
import account_settings_api from './account_settings_api'
import cleanup_api from './cleanup_api'
import webhook_settings from './webhook_settings'
import mail_webhook_settings from './mail_webhook_settings'
import worker_config from './worker_config'
import admin_mail_api from './admin_mail_api'
import { sendMailbyAdmin, sendMailByBindingAdmin } from './send_mail'
import db_api from './db_api'
import ip_blacklist_settings from './ip_blacklist_settings'
import ai_extract_settings from './ai_extract_settings'
import ai_advisor_api from './ai_advisor_api'
import e2e_test_api from './e2e_test_api'
import sub_admin_api from './sub_admin_api'
import global_ui_prefs from './global_ui_prefs'
import api_token_api from './api_token_api'
import address_groups_api from './address_groups_api'

export const api = new Hono<HonoCustomType>()

// address
api.get('/admin/address', address_api.listAddresses)
api.post('/admin/new_address', address_api.createNewAddress)
api.delete('/admin/delete_address/:id', address_api.deleteAddress)
api.delete('/admin/clear_inbox/:id', address_api.clearInbox)
api.delete('/admin/clear_sent_items/:id', address_api.clearSentItems)
api.get('/admin/show_password/:id', address_api.showPassword)
api.post('/admin/address/:id/reset_password', address_api.resetPassword)
api.post('/admin/address/:id/note', address_groups_api.saveNote)
api.get('/admin/address_notes', address_groups_api.listNotes)
api.get('/admin/address_groups', address_groups_api.listGroups)
api.post('/admin/address_groups', address_groups_api.createGroup)
api.post('/admin/address_groups/:id', address_groups_api.renameGroup)
api.delete('/admin/address_groups/:id', address_groups_api.deleteGroup)
api.get('/admin/address_groups/:id/members', address_groups_api.listMembers)
api.post('/admin/address_groups/:id/members', address_groups_api.addMembers)
api.delete('/admin/address_groups/:id/members', address_groups_api.removeMembers)
api.get('/admin/group_limits', address_groups_api.getLimits)
api.post('/admin/group_limits', address_groups_api.saveLimits)

// sub-admin + quota (main admin only for writes except GET domain costs)
api.get('/admin/sub_admins', sub_admin_api.listSubAdmins)
api.post('/admin/sub_admins', sub_admin_api.createSubAdmin)
api.post('/admin/sub_admins/:id', sub_admin_api.updateSubAdmin)
api.delete('/admin/sub_admins/:id', sub_admin_api.deleteSubAdmin)
api.post('/admin/sub_admins/:id/quota', sub_admin_api.adjustQuota)
api.get('/admin/sub_admins/:id/ledger', sub_admin_api.listLedger)
api.get('/admin/domain_create_costs', sub_admin_api.getDomainCreateCosts)
api.post('/admin/domain_create_costs', sub_admin_api.saveDomainCreateCosts)

// mail api
api.get('/admin/mails', admin_mail_api.getMails)
api.get('/admin/mails_unknow', admin_mail_api.getUnknowMails)
api.get('/admin/mails/:id', admin_mail_api.getMail)
api.delete('/admin/mails/:id', admin_mail_api.deleteMail)

// address sender
api.get('/admin/address_sender', address_sender_api.list)
api.post('/admin/address_sender', address_sender_api.update)
api.delete('/admin/address_sender/:id', address_sender_api.remove)

// sendbox
api.get('/admin/sendbox', sendbox_api.list)
api.delete('/admin/sendbox/:id', sendbox_api.remove)

// statistics
api.get('/admin/statistics', statistics_api.get)

// account settings
api.get('/admin/account_settings', account_settings_api.get)
api.post('/admin/account_settings', account_settings_api.save)

// cleanup
api.post('/admin/cleanup', cleanup_api.cleanup)
api.get('/admin/auto_cleanup', cleanup_api.getCleanup)
api.post('/admin/auto_cleanup', cleanup_api.saveCleanup)

// webhook settings
api.get('/admin/webhook/settings', webhook_settings.getWebhookSettings)
api.post('/admin/webhook/settings', webhook_settings.saveWebhookSettings)

// mail webhook settings
api.get('/admin/mail_webhook/settings', mail_webhook_settings.getWebhookSettings)
api.post('/admin/mail_webhook/settings', mail_webhook_settings.saveWebhookSettings)
api.post('/admin/mail_webhook/test', mail_webhook_settings.testWebhookSettings)

// worker config
api.get('/admin/worker/configs', worker_config.getConfig)

// send mail by admin
api.post('/admin/send_mail', sendMailbyAdmin)
api.post('/admin/send_mail_by_binding', sendMailByBindingAdmin)

// db api
api.get('admin/db_version', db_api.getVersion)
api.post('admin/db_initialize', db_api.initialize)
api.post('admin/db_migration', db_api.migrate)

// IP blacklist settings
api.get('/admin/ip_blacklist/settings', ip_blacklist_settings.getIpBlacklistSettings)
api.post('/admin/ip_blacklist/settings', ip_blacklist_settings.saveIpBlacklistSettings)

// AI extract settings (inbound verification-code extract)
api.get('/admin/ai_extract/settings', ai_extract_settings.getAiExtractSettings)
api.post('/admin/ai_extract/settings', ai_extract_settings.saveAiExtractSettings)

// AI advisor (Workers AI chat over authorized mailboxes)
api.get('/admin/ai_advisor/mailboxes', ai_advisor_api.listMailboxes)
api.get('/admin/ai_advisor/auth', ai_advisor_api.getAuth)
api.post('/admin/ai_advisor/auth', ai_advisor_api.saveAuth)
api.get('/admin/ai_advisor/messages', ai_advisor_api.listMessages)
api.delete('/admin/ai_advisor/messages', ai_advisor_api.clearMessages)
api.post('/admin/ai_advisor/chat', ai_advisor_api.chat)
api.get('/admin/ai_advisor/models', ai_advisor_api.listModels)
api.get('/admin/ai_advisor/provider', ai_advisor_api.listModels)
api.post('/admin/ai_advisor/provider', ai_advisor_api.saveProvider)
api.post('/admin/ai_advisor/test', ai_advisor_api.testProvider)
api.get('/admin/ai_advisor/policy', ai_advisor_api.getPolicy)
api.post('/admin/ai_advisor/policy', ai_advisor_api.savePolicy)

// API tokens (scoped keys for the current admin)
api.get('/admin/api_tokens/catalog', api_token_api.catalog)
api.get('/admin/api_tokens', api_token_api.list)
api.post('/admin/api_tokens', api_token_api.create)
api.delete('/admin/api_tokens/:id', api_token_api.revoke)

// global UI prefs (About / GitHub visibility per role)
api.get('/admin/global_ui_prefs', global_ui_prefs.get)
api.post('/admin/global_ui_prefs', global_ui_prefs.save)

// E2E test endpoints
api.post('/admin/test/seed_mail', e2e_test_api.seedMail)
api.post('/admin/test/receive_mail', e2e_test_api.receiveMail)
