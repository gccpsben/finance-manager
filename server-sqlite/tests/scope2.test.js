import { use, expect } from 'chai';
import chaiHttp from 'chai-http';
const chai = use(chaiHttp);

export default function(serverPort)
{
    describe("Testing Scope 2" , () => 
    {
        it("Test 1", () => { chai.assert.typeOf(1, 'number'); });
    
        it("HTTP Test 2", function(done) 
        {
            chai.request.execute(`http://localhost:${serverPort}`)
            .get('/dummyEndpoint')
            .end((err, res) => 
            {
                expect(res).to.have.status(200);
                done();
            });
        });
    });    
}