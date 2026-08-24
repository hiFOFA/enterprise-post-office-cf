import { Context } from 'hono'

import i18n from '../i18n';

const createNewAddress = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    return c.text(msgs.NewAddressDisabledMsg, 403)
};

export default { createNewAddress };
