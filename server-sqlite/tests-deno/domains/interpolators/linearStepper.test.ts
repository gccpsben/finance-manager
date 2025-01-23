/// <reference lib="deno.ns" />

import { Decimal } from "npm:decimal.js";
import { assertEquals } from "jsr:@std/assert/equals";
import { LinearStepper } from "../../../server_source/calculations/linearStepper.ts";

Deno.test(`Linear Stepper`, _test =>
{
    const refTest = { test: 1, test3: 3 };
    const definedPoints =
    [
        { key: new Decimal("-10") , value: refTest },
        { key: new Decimal("-5")  , value: new Decimal("2") },
        { key: new Decimal("-1")  , value: { test: 1, test2: 2 } }, // value can be anything
        { key: new Decimal("0")   , value: new Decimal("1") },
        { key: new Decimal("0.1") , value: new Decimal("2") },
        { key: new Decimal("5")   , value: new Decimal("1.3") },
        { key: new Decimal("6")   , value: new Decimal("1.4") },
        { key: new Decimal("6")   , value: refTest },
        { key: new Decimal("9")   , value: new Decimal("-10") }
    ];
    const interpolator = LinearStepper.fromEntriesWithMapper<
    {
        key: Decimal,
        value: object | Decimal
    }, object | Decimal>(definedPoints, p => p);

    const expectedValues =
    [
        [-15    , 0          ],
        [-10    , refTest    ] as const,
        [-4     , 2          ],
        [-1     , { test: 1, test2: 2 }] as const,
        [-0.1   , { test: 1, test2: 2 }] as const,
        [0      , 1          ],
        [1      , 2          ],
        [2      , 2          ],
        [10     , -10        ],
        [6      , refTest    ] as const,
        [4.4    , 2          ]
    ];
    for (const [ input, output ] of expectedValues)
    {
        const actualOutput = interpolator.getValue(new Decimal(input), new Decimal(0));

        if (typeof output === 'number')
            assertEquals(actualOutput?.toString(), new Decimal(output).toString(), `input: ${input}`);
        else
            assertEquals(JSON.stringify(actualOutput), JSON.stringify(output), `input: ${input}`);
    }
});