<script setup lang="ts">
import { FlaskConical, RotateCcw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { computed } from 'vue';
import type { NtbInput } from '@/types/ntb';
import type { AssignmentRecord } from '@/lib/assignment';
import AssignmentLookup from './AssignmentLookup.vue';
import MoneyField from './MoneyField.vue';
import SearchableSelect, { type SelectItem } from './SearchableSelect.vue';

defineProps<{ categoryItems: SelectItem[]; kbliItems: SelectItem[]; commodityItems: SelectItem[] }>();
const input = defineModel<NtbInput>({ required: true });
defineEmits<{ category: [code: string | null]; kbli: [code: string | null]; sample: []; reset: []; assignment: [record: AssignmentRecord] }>();

/** Rincian 26 is filled per month for a business that started in 2026. */
const unit = computed(() => (input.value.startedThisYear ? ' (sebulan)' : ''));

const workersText = (value: number | null) => (value === null ? '' : String(value));
function onWorkers(event: Event) {
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '');
  (event.target as HTMLInputElement).value = digits;
  input.value.workers = digits ? Number(digits) : null;
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Data usaha</CardTitle>
      <CardDescription>Isi sesuai kuesioner. Semua angka dalam rupiah setahun.</CardDescription>
      <div class="col-start-1 mt-1 flex gap-2 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
        <Button type="button" variant="outline" size="sm" @click="$emit('sample')"><FlaskConical aria-hidden="true" /> Isi contoh</Button>
        <Button type="button" variant="ghost" size="sm" @click="$emit('reset')"><RotateCcw aria-hidden="true" /> Kosongkan</Button>
      </div>
    </CardHeader>

    <CardContent class="grid gap-6">
      <section class="grid gap-4" aria-labelledby="identitas">
        <h3 id="identitas" class="text-sm font-semibold text-primary">Identitas usaha</h3>
        <AssignmentLookup @fill="$emit('assignment', $event)" />
        <div class="grid gap-1.5">
          <Label class="font-normal">Kategori KBLI</Label>
          <SearchableSelect :model-value="input.category" :items="categoryItems" placeholder="Pilih kategori" search-placeholder="Cari kategori, mis. G atau perdagangan" @update:model-value="$emit('category', $event)" />
        </div>
        <div class="grid gap-1.5">
          <Label class="font-normal">KBLI 5 digit</Label>
          <SearchableSelect :model-value="input.kbli" :items="kbliItems" placeholder="Pilih KBLI" search-placeholder="Cari kode atau nama usaha, mis. 47111" @update:model-value="$emit('kbli', $event)" />
        </div>
        <div v-if="input.category === 'A'" class="grid gap-1.5">
          <Label class="font-normal">Komoditas kategori A <span class="text-muted-foreground">untuk work in progress</span></Label>
          <SearchableSelect v-model="input.commodity" :items="commodityItems" placeholder="Pilih komoditas" search-placeholder="Cari komoditas" />
        </div>
        <div class="grid gap-1.5">
          <Label for="workers" class="font-normal">Banyaknya tenaga kerja</Label>
          <Input id="workers" inputmode="numeric" placeholder="mis. 3" :model-value="workersText(input.workers)" @input="onWorkers" />
        </div>
      </section>

      <Separator />

      <section class="grid gap-4" aria-labelledby="pengeluaran">
        <h3 id="pengeluaran" class="text-sm font-semibold text-primary">Pengeluaran usaha <span class="font-normal text-muted-foreground">Rincian 26</span></h3>
        <MoneyField v-model="input.wages" :label="`26a. Total upah dan gaji, serta jaminan sosial petugas${unit}`" />
        <MoneyField v-model="input.production" :label="`26b. Biaya produksi${unit}`" />
        <MoneyField v-model="input.purchases" :label="`26c. Biaya pembelian barang yang terjual${unit}`" />
        <MoneyField v-model="input.operating" :label="`26d. Biaya operasional${unit}`" />
        <MoneyField v-model="input.nonOperating" :label="`26e. Biaya non operasional${unit}`" />
      </section>

      <Separator />

      <section class="grid gap-4" aria-labelledby="pendapatan">
        <h3 id="pendapatan" class="text-sm font-semibold text-primary">Pendapatan usaha <span class="font-normal text-muted-foreground">Rincian 27</span></h3>
        <div class="flex items-start gap-3 rounded-lg border bg-secondary/40 p-3">
          <Switch id="started-this-year" v-model="input.startedThisYear" class="mt-0.5" />
          <div class="grid gap-0.5">
            <Label for="started-this-year" class="leading-snug">Usaha mulai beroperasi tahun 2026</Label>
            <p class="text-xs text-muted-foreground">Omzet memakai rincian 31a dan semua pengeluaran rincian 26 diisi per bulan. Aplikasi mengalikannya dengan 12.</p>
          </div>
        </div>
        <MoneyField v-if="input.startedThisYear" v-model="input.monthlyRevenue" label="31a. Nilai produksi, penjualan, atau pendapatan barang dan jasa sebulan" />
        <MoneyField v-else v-model="input.revenue" label="27a. Nilai produksi, penjualan, atau pendapatan barang dan jasa setahun" />
        <MoneyField v-model="input.otherRevenue" label="27b. Pendapatan lainnya" />
      </section>
    </CardContent>
  </Card>
</template>
