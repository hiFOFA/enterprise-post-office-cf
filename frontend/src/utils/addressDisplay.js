const isAdminApiSource = (sourceMeta) => {
    const value = (sourceMeta || '').trim()
    return value.startsWith('admin:') && value.endsWith(':api')
}

export const formatOwnerDisplay = (row = {}) => {
    const name = row.ownerUsername
        || row.owner_username
        || row.createdBy
        || row.created_by
        || row.owner
        || ''
    const sourceMeta = row.sourceMeta ?? row.source_meta
    if (name) {
        return isAdminApiSource(sourceMeta) ? `${name}-api` : name
    }
    const ownerType = row.ownerAdminType || row.owner_admin_type
    if (ownerType === 'main') return row.fallbackMain || 'main'
    if (ownerType === 'sub') {
        const id = row.ownerAdminId ?? row.owner_admin_id
        const label = row.fallbackSub || 'sub'
        return id ? `${label} #${id}` : label
    }
    return ''
}

export const displayAddressName = (note, email) => {
    const trimmed = (note || '').trim()
    return trimmed || (email || '')
}
