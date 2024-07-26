export {};

import chaiModule from "chai";
import chaiHttp from "chai-http";
const chai = chaiModule.use(chaiHttp);

describe("Testing Scope 2" , () => 
{
    it("Testing Test 1", () => 
    {
        chai.assert.typeOf(1, 'number');
    });

    it("Testing Test 2", () => 
    {
        chai.assert.typeOf(1, 'string');
    });
});    