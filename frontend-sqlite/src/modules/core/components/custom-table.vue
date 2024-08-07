<template>
    <gridShortcut :columns="computedColumns" :rows="computedRows">

        <div v-for="(column, columnIndex) in columns" :key="column.field" 
        class="center cell start-row"
        :class="
        {
            'end-column': columnIndex == columns.length - 1, 
            'start-column': columnIndex == 0
        }">
            <slot name="headercell" :currentColumn="column"></slot>
        </div>

        <div v-for="cell in computedCells" class="center cell"
        :class="
        {
            'end-column': cell.isCellInTheLastColumn, 
            'start-column': cell.isCellInTheFirstColumn,
            'end-row': cell.isCellInTheLastRow
        }">
            <slot name="cell" 
            :currentColumn="cell.currentColumn" 
            :currentRow="cell.currentRow"
            :cellValueReadonly="cell.currentRow.data[cell.currentColumn.field]"></slot>
        </div>

    </gridShortcut>    
</template>

<style less="less">
.cell { border:1px solid v-bind(borderColor); border-right:0px; border-bottom:0px; color:white; box-sizing: border-box; }
.start-column { border-right:0px; }
.end-column {  border-right:1px solid v-bind(borderColor); }
.end-row { border-bottom:1px solid v-bind(borderColor); }
</style>

<script lang="ts" setup>
import gridShortcut from '../components/gridShortcut.vue';
</script>

<script lang="ts">

export interface TableColumnDefinition
{
    label: string;
    field: string;
    width?: string; 
}

export interface TableRowDefinition
{
    height?:string;
    data: any;
}

export default
{
    props:
    {
        columns:
        {
            required:true,
            type: Array<TableColumnDefinition>
        },
        rows:
        {
            required: true,
            type: Array<TableRowDefinition>,
            default: []
        },
        headerHeight:
        {
            required:false,
            type: String,
            default: "min-content"
        },
        defaultRowHeight:
        {
            required:false,
            type: String,
            default: "30px"
        },
        borderColor:
        {
            required:false,
            type: String,
            default: "#FFF"
        }
    },
    data()
    {
        return { };
    },
    computed:
    {
        computedColumns()
        {
            return this.columns.map(col => col.width ?? "1fr").join(" ");
        },
        computedRows()
        {
            let headerRow = this.headerHeight;
            return [headerRow, ...this.rows.map(row => row.height ?? this.defaultRowHeight ?? "min-content")].join(" ");
        },
        computedCells()
        {
            let result : 
            {
                "currentRow":TableRowDefinition,
                "currentColumn":TableColumnDefinition,
                "isCellInTheLastColumn": boolean,
                "isCellInTheFirstColumn": boolean,
                "isCellInTheLastRow": boolean
            }[] = [];

            let self = this;

            for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex++)
            {
                let currentRow = this.rows[rowIndex];
                for (let columnIndex = 0; columnIndex < this.columns.length; columnIndex++)
                {
                    let currentColumn = this.columns[columnIndex];
                    result.push(
                    {
                        "currentRow": currentRow, 
                        "currentColumn":currentColumn,
                        "isCellInTheLastColumn": columnIndex == this.columns.length - 1,
                        "isCellInTheFirstColumn": columnIndex == 0,
                        "isCellInTheLastRow": rowIndex == self.rows.length - 1
                    });
                }
            }

            console.log("changed");

            return result;
        }
    }
}
</script>