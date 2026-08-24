<script setup>
import { useGlobalState } from '../../store'
import AddressGroups from '../../components/AddressGroups.vue'

const { isMainAdmin } = useGlobalState()
</script>

<template>
    <AddressGroups api-prefix="/admin" :show-limits="isMainAdmin" />
</template>
