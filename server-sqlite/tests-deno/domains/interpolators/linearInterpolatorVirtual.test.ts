/// <reference lib="deno.ns" />

import { Decimal } from "npm:decimal.js";
import { LinearInterpolator } from "../../../server_source/calculations/linearInterpolator.ts";
import { assertEquals } from "jsr:@std/assert/equals";
import { LinearInterpolatorVirtual } from "../../../server_source/calculations/linearInterpolatorVirtual.ts";

Deno.test("Virtual Linear Interpolator - 1", async _test =>
{
    const definedPoints =
    [
        { key: new Decimal(`0`), value: new Decimal(`50`) },
        { key: new Decimal(`1`), value: new Decimal(`150`) }
    ];
    const interpolator = await LinearInterpolatorVirtual.fromEntries
    (
        definedPoints,
        e => new Promise<Decimal>(r => r(e.key)),
        e => new Promise<Decimal>(r =>
        {
            setTimeout(
                () => r(definedPoints.find(x => x.key === e)!.value.sub(50)),
                Math.random() * 100
            );
        })
    );
    const expectedValues =
    [
        [ new Decimal(`-1`)     , undefined            ],
        [ new Decimal(`-0.1`)   , undefined            ],
        [ new Decimal(`0`)      , new Decimal(`0`)     ],
        [ new Decimal(`-0`)     , new Decimal(`0`)     ],
        [ new Decimal(`0.4111`) , new Decimal(`41.11`) ],
        [ new Decimal(`0.5`)    , new Decimal(`50`)    ],
        [ new Decimal(`1`)      , new Decimal(`100`)   ],
        [ new Decimal(`1.1`)    , undefined            ],
        [ new Decimal(`2`)      , undefined            ],
    ];

    for (const [ input, output ] of expectedValues)
    {
        const actualOutput = await interpolator.getValue(input!);
        assertEquals(actualOutput ? actualOutput.toString() : undefined, output ? output.toString() : undefined)
    }
})

Deno.test(`Virtual Linear Interpolator - 2`, _test =>
{
    Decimal.set({ precision: 32 });
    const definedPoints =
    [
        { key: new Decimal(`-0.725`), value: new Decimal(`21.7`) },
        { key: new Decimal(`-0.08`) , value: new Decimal(`69.1`) },
        { key: new Decimal(`1.427`) , value: new Decimal(`89.4`) }
    ];
    const interpolator = LinearInterpolator.fromEntries(definedPoints, e => e.key, e => e.value);
    const expectedValues =
    [
        [ `-1`     , undefined                           ],
        [ `-0.3`   , `52.932558139534883720930232558139` ],
        [ `0.1`    , `71.524684804246848042468480424685` ],
        [ `0.2`    , `72.871731917717319177173191771732` ],
        [ `0.3`    , `74.218779031187790311877903118779` ],
        [ `0.4`    , `75.565826144658261446582614465826` ],
        [ `1`      , `83.648108825481088254810882548109` ],
        [ `1.5`    , undefined                           ],
        [ `-0.725` , `21.7`                              ],
        [ `-0.08`  , `69.1`                              ],
        [ `1.427`  , `89.4`                              ]
    ];
    for (const [ input, output ] of expectedValues)
    {
        const actualOutput = interpolator.getValue(new Decimal(input!));
        assertEquals(actualOutput ? actualOutput.toString() : undefined, output ? new Decimal(output).toString() : undefined)
    }
});