<template>
    <div>
        <slot :select="select" :currentOption="computedOption" :options="options"></slot>
    </div>
</template>

<style lang="less" scoped>

</style>

<script setup lang="ts">

</script>

<script lang="ts">
export default
{
    props:
    {
        "options": { type: Array<string>, default: ['option1', 'option2'] },
        "currentOption": { type:String }
    },
    data()
    {
        return { internalCurrentOption: undefined as undefined|string }
    },
    mounted()
    {
        if ((this.$attrs as any)["onUpdate:currentOption"] == undefined && this.currentOption != undefined)
        console.warn(`Please use v-model:currentOptions to bind to options, changes coming from the component won't be reflected to original property otherwise.`);
    },
    methods:
    {
        setCurrentOption(targetOption:string|undefined)
        {
            if (this.currentOption == undefined) this.internalCurrentOption = targetOption;
            else this.$emit("update:currentOption", targetOption);
        },
        select(targetOption: string)
        {
            if (this.options == undefined) return;
            if (this.options.length == 0) return;
            if (targetOption == undefined) return;
            if (!this.options.includes(targetOption)) return;
            this.setCurrentOption(targetOption);
        }
    },
    computed:
    {
        computedOption() { return this.currentOption || this.internalCurrentOption; }
    },
    watch:
    {
        "options":
        {
            handler: function(newValue, oldValue)
            {
                if (newValue == undefined) return;
                if (this.computedOption == undefined && newValue.length > 0) this.setCurrentOption(newValue[0]);
                if (this.computedOption == undefined) return;
                if (newValue.length == 0) this.setCurrentOption(undefined);
                if (!newValue.includes(this.computedOption)) this.setCurrentOption(newValue[0]);
            },
            immediate: true
        }
    }
}
</script>