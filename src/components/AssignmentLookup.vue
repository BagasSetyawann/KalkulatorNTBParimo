<script setup lang="ts">
import { CheckCircle2, Loader2, Search, TriangleAlert, Users } from '@lucide/vue';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { findAssignment, REFERENCE_COLUMNS, type AssignmentRecord, type ReferenceKey } from '@/lib/assignment';

const emit = defineEmits<{ fill: [record: AssignmentRecord] }>();

const id = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
/** Every record that shares the searched id (length > 1 means the id is duplicated in the sheet). */
const matches = ref<AssignmentRecord[]>([]);
const found = ref<AssignmentRecord | null>(null);

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const referenceRows = (r: AssignmentRecord) =>
  (Object.keys(REFERENCE_COLUMNS) as ReferenceKey[])
    .filter((k) => r.reference[k] !== undefined)
    .map((k) => ({ label: REFERENCE_COLUMNS[k], value: rupiah(r.reference[k]!) }));
const describe = (r: AssignmentRecord) => [r.kbli && `KBLI ${r.kbli}`, `baris ${r.row}`].filter(Boolean).join(' · ');

function choose(record: AssignmentRecord) {
  found.value = record;
  emit('fill', record);
}

async function lookup(refresh = false) {
  const value = id.value.trim();
  if (!value || loading.value) return;
  loading.value = true;
  error.value = null;
  found.value = null;
  matches.value = [];
  try {
    const records = await findAssignment(value, refresh);
    if (!records.length) {
      error.value = `assignment_id "${value}" tidak ditemukan.`;
      return;
    }
    matches.value = records;
    // Only fill straight away when the id is unambiguous; otherwise wait for the user to pick.
    if (records.length === 1) choose(records[0]);
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

    <template v-else>
      <div v-if="matches.length > 1" class="grid gap-1.5 text-xs">
        <p class="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
          <Users class="mt-px size-3.5 shrink-0" aria-hidden="true" />
          assignment_id ini dipakai oleh {{ matches.length }} usaha. Pilih usaha yang ingin diisikan:
        </p>
        <div role="radiogroup" aria-label="Pilih nama usaha" class="grid gap-1">
          <button
            v-for="(m, i) in matches"
            :id="`assignment-match-${i}`"
            :key="m.row"
            type="button"
            role="radio"
            :aria-checked="found === m"
            class="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="found === m ? 'border-primary bg-primary/10' : ''"
            @click="choose(m)"
          >
            <span class="min-w-0">
              <span class="block truncate font-medium text-foreground">{{ m.name ?? '(tanpa nama usaha)' }}</span>
              <span class="block text-muted-foreground">{{ describe(m) }}</span>
            </span>
            <CheckCircle2 v-if="found === m" class="size-4 shrink-0 text-primary" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div v-if="found" class="grid gap-1 text-xs" role="status">
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
    </template>
  </div>
</template>
