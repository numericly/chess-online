<script>
	import { SettingsIcon } from 'svelte-feather-icons';
	import '../app.css';
</script>

<button class="btn m-1 absolute" style="left: calc(100vw - 58px - 0.5rem)">
	<SettingsIcon size="24" />
</button>
<slot />
