<script>
  let { class: className = '' } = $props()
</script>

<span class="receptsarok-logo {className}" role="img" aria-label="Receptsarok"
  ><span class="lt">RECEPTSAR</span><svg
    class="circle-icon"
    viewBox="0 0 60 60"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="30" cy="30" r="24" fill="none" stroke="#3F87C4" stroke-width="8" />
    <g transform="translate(30,30)" fill="none" stroke-linecap="round">
      <g transform="rotate(-35)" stroke="var(--logo-utensil, #de863e)" stroke-width="2.2">
        <line x1="0" y1="13" x2="0" y2="-3" />
        <line x1="-2.8" y1="-3" x2="-2.8" y2="-12" stroke-width="1.4" />
        <line x1="0" y1="-3" x2="0" y2="-12" stroke-width="1.4" />
        <line x1="2.8" y1="-3" x2="2.8" y2="-12" stroke-width="1.4" />
      </g>
      <g transform="rotate(35)">
        <line
          x1="0"
          y1="13"
          x2="0"
          y2="-12"
          stroke="var(--logo-utensil, #de863e)"
          stroke-width="2.2"
        />
        <path d="M0,-12 C4,-8 4,-2 0,2" fill="var(--logo-utensil, #de863e)" />
      </g>
    </g></svg
  ><span class="lt">K</span></span
>

<style>
  .receptsarok-logo {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }
  .lt {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-weight: 700;
    color: #de863e;
    line-height: 1;
    letter-spacing: 0.02em;
  }
  .circle-icon {
    height: 1.15em;
    width: 1.15em;
    display: inline-block;
    margin: 0 -0.03em;
    transform: translateY(0.075em);
  }
</style>
