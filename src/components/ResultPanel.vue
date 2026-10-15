<script setup lang="ts">
import { ArrowRight, Check, Copy, Info, TriangleAlert } from '@lucide/vue';
import { ref } from 'vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { pct, rp } from '@/lib/ntb';
import type { Issue } from '@/lib/summary';
import type { NtbData, NtbInput, NtbResult } from '@/types/ntb';
import ResultRow from './ResultRow.vue';
import StatusBadge from './StatusBadge.vue';

const props = defineProps<{ result: NtbResult; input: NtbInput; issues: Issue[]; text: string; started: boolean; data: NtbData }>();

const copied = ref<'idle' | 'ok' | 'failed'>('idle');
async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    copied.value = 'ok';
  } catch {
    copied.value = 'failed';
  }
  setTimeout(() => (copied.value = 'idle'), 1800);
}

const rangeText = (r: NtbResult) => (r.ntbRange ? `${pct(r.ntbRange[0])} sampai ${pct(r.ntbRange[1])}` : props.input.category ? 'tidak ada batas untuk kategori ini' : 'pilih kategori KBLI terlebih dahulu');
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Hasil pemeriksaan</CardTitle>
      <CardDescription>Diperbarui saat Anda mengetik.</CardDescription>
      <Button type="button" variant="outline" size="sm" class="no-print col-start-1 mt-1 w-fit sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end" :disabled="!started" @click="copy">
        <Check v-if="copied === 'ok'" aria-hidden="true" /><Copy v-else aria-hidden="true" />
        {{ copied === 'ok' ? 'Tersalin' : copied === 'failed' ? 'Gagal menyalin' : 'Salin hasil' }}
      </Button>
    </CardHeader>

    <CardContent>
      <p v-if="!started" class="py-10 text-center text-sm text-muted-foreground">
        Pilih kategori KBLI dan isi angka usaha di sebelah kiri. Hasil muncul di sini.
      </p>

      <div v-else class="grid gap-5" aria-live="polite">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-lg border bg-secondary/50 p-3">
            <p class="text-xs tracking-wide text-muted-foreground uppercase">Total pengeluaran</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ rp(result.totalExpense) }}</p>
            <p class="text-xs text-muted-foreground">26a sampai 26e</p>
          </div>
          <div class="rounded-lg border bg-secondary/50 p-3">
            <p class="text-xs tracking-wide text-muted-foreground uppercase">Total pendapatan</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ rp(result.totalRevenue) }}</p>
            <p class="text-xs text-muted-foreground">omzet dan 27b</p>
          </div>
          <div class="rounded-lg border p-3" :class="result.profit < 0 ? 'border-warning/30 bg-warning-soft text-warning' : 'bg-secondary/50'">
            <p class="text-xs tracking-wide uppercase" :class="result.profit < 0 ? '' : 'text-muted-foreground'">Selisih</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ rp(result.profit) }}</p>
            <p class="text-xs" :class="result.profit < 0 ? '' : 'text-muted-foreground'">{{ result.profit < 0 ? 'Usaha rugi' : result.profit > 0 ? 'Usaha untung' : ' ' }}</p>
          </div>
        </div>

        <section aria-labelledby="usaha">
          <h3 id="usaha" class="text-sm font-semibold text-primary">Usaha dan tenaga kerja</h3>
          <dl class="divide-y">
            <ResultRow label="Kategori"><span class="font-normal">{{ result.categoryTitle ? `${input.category}. ${result.categoryTitle}` : '-' }}</span></ResultRow>
            <ResultRow label="KBLI"><span class="font-normal">{{ result.kbliTitle ? `${input.kbli} ${result.kbliTitle}` : '-' }}</span></ResultRow>
            <ResultRow label="Klasifikasi usaha">{{ result.sizeClass ?? '-' }}</ResultRow>
            <ResultRow label="Upah per tenaga kerja setahun">
              <template v-if="result.wagePerWorker !== null">{{ rp(result.wagePerWorker) }} <span class="font-normal text-muted-foreground">({{ rp(result.wagePerWorker / 12) }} per bulan)</span></template>
              <template v-else>-</template>
            </ResultRow>
          </dl>
        </section>

        <section aria-labelledby="nilai-tambah">
          <h3 id="nilai-tambah" class="text-sm font-semibold text-primary">Nilai tambah</h3>
          <dl class="divide-y">
            <ResultRow label="Omzet" :hint="input.startedThisYear ? '(31a × 12)' : '(27a)'">{{ rp(result.turnover) }}</ResultRow>
            <ResultRow label="Output" hint="(omzet − 26c, biaya pembelian barang yang terjual)">{{ rp(result.output) }}</ResultRow>
            <ResultRow label="Nilai tambah" hint="(omzet − 26b − 26c − 26d)">{{ rp(result.valueAdded) }}</ResultRow>
            <ResultRow label="Rasio NTB" hint="(nilai tambah ÷ output)">
              <template v-if="result.ntbRatio !== null">{{ pct(result.ntbRatio) }} <StatusBadge :status="result.ntbStatus" /></template>
              <template v-else>-</template>
            </ResultRow>
            <ResultRow label="Rentang rasio NTB"><span class="font-normal text-muted-foreground">{{ rangeText(result) }}<template v-if="input.category"> (kategori {{ input.category }})</template></span></ResultRow>
            <ResultRow label="Rasio upah" hint="(26a ÷ nilai tambah)">
              <template v-if="result.wageRatio !== null">{{ pct(result.wageRatio) }} <StatusBadge :status="result.wageStatus" /></template>
              <template v-else>-</template>
            </ResultRow>
            <ResultRow label="Rentang rasio upah"><span class="font-normal text-muted-foreground">{{ pct(data.wageToNtb[0]) }} sampai {{ pct(data.wageToNtb[1]) }}</span></ResultRow>
          </dl>
        </section>

        <section aria-labelledby="periksa" class="grid gap-2">
          <h3 id="periksa" class="text-sm font-semibold text-primary">Perlu diperiksa</h3>
          <p v-if="!issues.length" class="text-sm text-muted-foreground">Tidak ada peringatan untuk angka yang sudah diisi.</p>
          <Alert v-for="(issue, index) in issues" :key="index"
            :class="issue.kind === 'warning' ? 'border-warning/30 bg-warning-soft text-warning' : issue.kind === 'tip' ? 'border-info/30 bg-info-soft text-info' : ''">
            <TriangleAlert v-if="issue.kind === 'warning'" aria-hidden="true" />
            <ArrowRight v-else-if="issue.kind === 'tip'" aria-hidden="true" />
            <Info v-else aria-hidden="true" />
            <AlertDescription class="text-current">{{ issue.text }}</AlertDescription>
          </Alert>
        </section>
      </div>
    </CardContent>
  </Card>
</template>
