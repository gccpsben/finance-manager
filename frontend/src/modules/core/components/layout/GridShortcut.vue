<template>
    <div :style="{'grid-template-areas': areas, 'grid-template-columns': columns, 'grid-template-rows': rows}" class="main">
		<slot></slot>
    </div>
</template>

<script>

export default
{
	data()
	{
		return { currentPath: window.location, navHidden:false, documentObject:document }
	},
	props:
	{
		rows: { type: String },
		areas: { type: String },
		columns: { type: String }
	}
};

</script>

<style scoped>
.main { display:grid; }
</style>