<script setup lang="ts">
import { useId } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

defineProps<{ label: string; prefix?: string }>();
const model = defineModel<number | null>({ required: true });
const id = useId();

const digitsOf = (text: string) => text.replace(/\D/g, '');
const dotted = (digits: string) => (digits ? Number(digits).toLocaleString('id-ID') : '');

/** Whole numbers with thousand dots while typing; the caret stays after the same digit. */
function onInput(event: Event) {
  const el = event.target as HTMLInputElement;
  const before = digitsOf(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
  const digits = digitsOf(el.value);
  el.value = dotted(digits);
  let pos = 0;
  let seen = 0;
  while (pos < el.value.length && seen < before) {
    if (/\d/.test(el.value[pos])) seen++;
    pos++;
  }
  el.setSelectionRange(pos, pos);
  model.value = digits ? Number(digits) : null;
}
</script>

<template>
  <div class="grid gap-1.5">
    <Label :for="id" class="leading-snug font-normal">{{ label }}</Label>
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">{{ prefix ?? 'Rp' }}</span>
      <Input :id="id" inputmode="numeric" placeholder="0" class="pl-10 text-right tabular-nums" :model-value="model === null ? '' : dotted(String(model))" @input="onInput" />
    </div>
  </div>
</template>
