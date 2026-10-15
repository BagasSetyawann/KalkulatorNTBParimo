<script setup lang="ts">
import { Calculator, ShieldCheck } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import InputPanel from '@/components/InputPanel.vue';
import ResultPanel from '@/components/ResultPanel.vue';
import SuggestionPanel from '@/components/SuggestionPanel.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useNtbCalculator } from '@/composables/useNtbCalculator';

const { input, result, issues, suggestion, commodityItems, text, started, categoryItems, kbliItems, ntbData, setKbli, setCategory, loadSample, reset, applyAssignment } = useNtbCalculator();
</script>

<template>
  <div class="min-h-screen">
    <header class="no-print border-b bg-card">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
        <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Calculator class="size-5" aria-hidden="true" /></div>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-semibold tracking-tight">Kalkulator NTB</h1>
          <p class="text-sm text-muted-foreground">Periksa kewajaran Nilai Tambah Bruto, upah, dan komponen biaya usaha.</p>
        </div>
        <Badge variant="secondary" class="hidden sm:inline-flex"><ShieldCheck aria-hidden="true" /> Data tetap di browser Anda</Badge>
        <ThemeToggle />
      </div>
    </header>

    <main class="mx-auto grid max-w-6xl items-start gap-5 px-4 py-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <InputPanel v-model="input" :category-items="categoryItems" :kbli-items="kbliItems" :commodity-items="commodityItems" @category="setCategory" @kbli="setKbli" @sample="loadSample" @reset="reset" @assignment="applyAssignment" />
      <div class="grid gap-5">
        <ResultPanel :result="result" :input="input" :issues="issues" :text="text" :started="started" :data="ntbData" />
        <SuggestionPanel v-if="started" :suggestion="suggestion" :input="input" />
      </div>
    </main>

    <footer class="no-print mx-auto max-w-6xl px-4 pb-10 text-sm text-muted-foreground">
      <p>Rumus dan batas kewajaran bersumber dari berkas Kalkulator NTB_SharedV1.1 milik BPS Provinsi Sulawesi Tengah. Definisi omzet, output, dan nilai tambah mengikuti petunjuk FASIH Pendataan SE 2026. Saran nilai inputan mengikuti Kalkulator NTB Sumatera Utara V.1.1 milik BPS Provinsi Sumatera Utara. Alat ini membantu pemeriksaan awal dan bukan terbitan resmi BPS. Angka tidak dikirim atau disimpan di mana pun.</p>
    </footer>
  </div>
</template>
