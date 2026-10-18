<template>
  <div class="die" aria-hidden="true">
    <span class="pip p1" />
    <span class="pip p2" />
    <span class="pip p3" />
    <span class="pip p4" />
    <span class="pip p5" />
  </div>
</template>

<style scoped>
.die {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 72px;
  height: 72px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--die-pip) 18%, transparent);
  border-radius: var(--r-card);
  background: linear-gradient(145deg, var(--die-face), color-mix(in srgb, var(--die-face) 82%, var(--die-pip)));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--die-pip) 35%, transparent);
  transform: rotate(-7deg);
}

.pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--die-pip);
  align-self: center;
  justify-self: center;
}

.p1 {
  grid-area: 1 / 1;
}

.p2 {
  grid-area: 1 / 3;
}

.p3 {
  grid-area: 2 / 2;
}

.p4 {
  grid-area: 3 / 1;
}

.p5 {
  grid-area: 3 / 3;
}
</style>
