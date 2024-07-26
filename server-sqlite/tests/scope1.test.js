import chai from 'chai';

export default function(serverPort)
{
    describe("Testing Scope 1" , () => 
    {
        it("Test 1", function (done) 
        {
            this.timeout(10000); // expects at most 10000ms timeout
            chai.assert.typeOf(1, 'number');
            setTimeout(() => { done() }, 5000);
        });
    
        it("Test 2", () => { chai.assert.typeOf(1, 'string'); });
    });    
}