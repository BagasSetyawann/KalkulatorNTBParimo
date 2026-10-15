<script setup lang="ts">
import { CheckCircle2, Loader2, Search, TriangleAlert } from '@lucide/vue';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { findAssignment, REFERENCE_COLUMNS, type AssignmentRecord, type ReferenceKey } from '@/lib/assignment';

const emit = defineEmits<{ fill: [record: AssignmentRecord] }>();

const id = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const found = ref<AssignmentRecord | null>(null);

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const referenceRows = (r: AssignmentRecord) =>
  (Object.keys(REFERENCE_COLUMNS) as ReferenceKey[])
    .filter((k) => r.reference[k] !== undefined)
    .map((k) => ({ label: REFERENCE_COLUMNS[k], value: rupiah(r.reference[k]!) }));

async function lookup(refresh = false) {
  const value = id.value.trim();
  if (!value || loading.value) return;
  loading.value = true;
  error.value = null;
  found.value = null;
  try {
    const record = await findAssignment(value, refresh);
    if (!record) {
      error.value = `assignment_id "${value}" tidak ditemukan.`;
      return;
    }
    found.value = record;
    emit('fill', record);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal membaca data.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="grid gap-2 rounded-lg border border-dashed bg-secondary/30 p-3">
    <Label for="assignment-id" class="font-normal">Isi otomatis dari <span class="font-medium">assignment_id</span></Label>
    <form class="flex gap-2" @submit.prevent="lookup()">
      <Input id="assignment-id" v-model="id" placeholder="Tempel assignment_id lalu Enter" autocomplete="off" class="flex-1" />
      <Button id="assignment-lookup" type="submit" size="sm" class="h-9" :disabled="loading || !id.trim()">
        <Loader2 v-if="loading" class="animate-spin" aria-hidden="true" />
        <Search v-else aria-hidden="true" />
        Cari
      </Button>
    </form>

    <p v-if="error" class="flex items-start gap-1.5 text-xs text-destructive" role="alert">
      <TriangleAlert class="mt-px size-3.5 shrink-0" aria-hidden="true" /> {{ error }}
    </p>
    <div v-else-if="found" class="grid gap-1 text-xs" role="status">
      <p class="flex items-center gap-1.5 text-primary">
        <CheckCircle2 class="size-3.5 shrink-0" aria-hidden="true" /> {{ found.name ?? found.id }} berhasil diisikan ke form.
      </p>
      <dl v-if="referenceRows(found).length" class="grid grid-cols-[auto_1fr] gap-x-3 text-muted-foreground">
        <template v-for="row in referenceRows(found)" :key="row.label">
          <dt>{{ row.label }} (CSV)</dt>
          <dd class="text-right tabular-nums">{{ row.value }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
