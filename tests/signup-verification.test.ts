import test from 'node:test';
import assert from 'node:assert/strict';
import {signupCodeSchema,signupEmailSchema} from '../lib/auth-validation';

test('verification preserves leading zeroes and normalizes the email',()=>{
  assert.deepEqual(signupCodeSchema.parse({email:'Hello@Example.com',token:'001234'}),{email:'hello@example.com',token:'001234'});
});
test('verification rejects malformed codes, emails and extra fields',()=>{
  for(const token of ['','12345','12345678901','12 3456','12ab56'])assert.equal(signupCodeSchema.safeParse({email:'hello@example.com',token}).success,false);
  assert.equal(signupCodeSchema.safeParse({email:'invalid',token:'123456'}).success,false);
  assert.equal(signupCodeSchema.safeParse({email:'hello@example.com',token:'123456',type:'recovery'}).success,false);
  assert.equal(signupEmailSchema.safeParse({email:'hello@example.com',password:'unexpected'}).success,false);
});
