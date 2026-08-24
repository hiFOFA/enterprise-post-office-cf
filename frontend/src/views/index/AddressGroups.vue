<script setup>
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useGlobalState } from '../../store'
import { decodeJwtPayload, LOCAL_ADDRESS_CACHE_KEY } from '../../utils'
import AddressGroups from '../../components/AddressGroups.vue'

const { jwt } = useGlobalState()
const localAddressCache = useLocalStorage(LOCAL_ADDRESS_CACHE_KEY, [])

const localAddresses = computed(() => {
    const tokens = [...localAddressCache.value]
    if (jwt.value && !tokens.includes(jwt.value)) tokens.push(jwt.value)
    const seen = new Set()
    return tokens.map((curJwt) => {
        const payload = decodeJwtPayload(curJwt)
        const id = Number(payload?.address_id)
        const name = typeof payload?.address === 'string' ? payload.address : ''
        if (!id || seen.has(id)) return null
        seen.add(id)
        return { id, name, address: name }
    }).filter(Boolean)
})
</script>

<template>
    <AddressGroups api-prefix="/api" :local-addresses="localAddresses" />
</template>
