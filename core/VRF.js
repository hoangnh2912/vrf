const ECDSA = require('../utils/secp256k1');
const { mulmod, uint256, addmod, projectiveECMul, rnd, affineECMul, affineECAdd, projectiveECAdd, invmod } = require('../utils/secp256k1');
const { utils } = require('ethers');
require('dotenv').config();

const _0 = uint256(0);
const _1 = uint256(1);
const _7 = uint256(7);
const FIELD_SIZE = ECDSA.FIELD_SIZE;
const GROUP_ORDER = ECDSA.GROUP_ORDER;
const GX = ECDSA.GX;
const GY = ECDSA.GY;
const G = [GX, GY];
const SQRT_POWER = (FIELD_SIZE.add(_1)).shrn(2);

const PRIVATE_KEY = uint256(process.env.PRIVATE_KEY);
const PUBLIC_KEY = ECDSA.affineECMul(PRIVATE_KEY, [GX, GY])
const HASH_TO_CURVE_HASH_PREFIX = _1;
const SCALAR_FROM_CURVE_POINTS_HASH_PREFIX = uint256(2);
function bigModExp(base, exponent) {
    let res = _1;
    base = mulmod(_1, base)
    if (base.isZero()) {
        return _0;
    }
    while (exponent.gt(_0)) {
        // If y is odd, multiply x with result
        if (!exponent.and(_1).isZero()) {
            res = mulmod(res, base);
        }
        // y must be even now
        exponent = exponent.shrn(1); // y = y/2
        base = mulmod(base, base); // Change x to x^2
    }
    return res;
}

// Computes a s.t. a^2 = x in the field. Assumes a exists
function squareRoot(x) {
    return bigModExp(x, SQRT_POWER);
}

function ySquared(x) {
    // Curve is y^2=x^3+7. See section 2.4.1 of https://www.secg.org/sec2-v2.pdf
    let xCubed = mulmod(x, mulmod(x, x));
    return addmod(xCubed, _7);
}

function isOnCurve(p) {
    // Section 2.3.6. in https://www.secg.org/sec1-v2.pdf
    // requires each ordinate to be in [0, ..., FIELD_SIZE-1]
    if (p[0].gt(FIELD_SIZE) || p[1].gt(FIELD_SIZE)) {
        return false;
    }
    return (ySquared(p[0])).eq(mulmod(p[1], p[1]));
}

function fieldHash(b) {
    let x_ = uint256(utils.keccak256(b).slice(2));
    // Rejecting if x >= FIELD_SIZE corresponds to step 2.1 in section 2.3.4 of
    // http://www.secg.org/sec1-v2.pdf , which is part of the definition of
    // string_to_point in the IETF draft
    while (x_.gt(FIELD_SIZE)) {
        x_ = uint256(utils.keccak256(utils.solidityPack(['uint256'], [x_])).slice(2));
    }
    return x_;
}

function newCandidateSecp256k1Point(b) {
    let px = fieldHash(b);
    let py = squareRoot(ySquared(px));
    if (py.isOdd()) {
        // Note that 0 <= p[1] < FIELD_SIZE
        // so this cannot wrap, we use unchecked to save gas.
        py = FIELD_SIZE.sub(py);
    }
    return [px, py]
}
function hashToCurve(pk, input) {
    let rv = newCandidateSecp256k1Point(utils.solidityPack(['uint256', 'uint256', 'uint256', 'uint256'], 
    [HASH_TO_CURVE_HASH_PREFIX.toString(), pk[0].toString(), pk[1].toString(), input.toString()]));
    while (!isOnCurve(rv)) {
        rv = newCandidateSecp256k1Point(utils.solidityPack(['uint256'], [rv[0].toString()]));
    }
    return rv;
}
function encodePacked(hash, pk, gamma, u, v) {
    return utils.solidityPack(['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'address'], 
    [SCALAR_FROM_CURVE_POINTS_HASH_PREFIX.toString(), hash[0].toString(), hash[1].toString(), pk[0].toString(), pk[1].toString(), gamma[0].toString(), gamma[1].toString(), v[0].toString(), v[1].toString(), u]);
}
function addressFromPoint(P) {
    let address = utils.keccak256(utils.solidityPack(['uint256', 'uint256'], [P[0].toString(), P[1].toString()]))
    return utils.getAddress('0x' + address.slice(26));
}
function scalarFromCurvePoints(
    hash,
    pk,
    gamma,
    u,
    v
) {
    return uint256(utils.keccak256(encodePacked(hash, pk, gamma, u, v)).slice(2));
}
function vRF(seed, x = PRIVATE_KEY) {
    // h = H1(alpha)
    let h = hashToCurve(PUBLIC_KEY, seed);
    // gamma = h^x
    let gamma = affineECMul(x, h);
    // random nonce k
    let k = rnd(GROUP_ORDER);
    console
    let c = scalarFromCurvePoints(h, PUBLIC_KEY, gamma, addressFromPoint(affineECMul(k, G)), affineECMul(k, h));

    let s = addmod(k, mulmod(GROUP_ORDER.sub(c), x, GROUP_ORDER), GROUP_ORDER);
    return [gamma, c, s]
}
function proofVRF(seed, x = PRIVATE_KEY) {
    [gamma, c, s] = vRF(seed);
    u = affineECAdd(affineECMul(c, PUBLIC_KEY), affineECMul(s, G));
    u = addressFromPoint(u);

    h = hashToCurve(PUBLIC_KEY, seed);
    let v = affineECAdd(affineECMul(c, gamma), affineECMul(s, h));

    let cGammaWitness = affineECMul(c, gamma);
    let sHashWitness = affineECMul(s, h);

    let invZ = projectiveECAdd(cGammaWitness[0], cGammaWitness[1], _1, sHashWitness[0], sHashWitness[1], _1);
    invZ = invmod(invZ[2]);
    let proof = {};
    proof.pk = ['0x' + PUBLIC_KEY[0].toString('hex'), '0x' + PUBLIC_KEY[1].toString('hex')];
    proof.gamma = ['0x' + gamma[0].toString('hex'), '0x' + gamma[1].toString('hex')];
    proof.c = c.toString();
    proof.s = s.toString();
    proof.seed = seed.toString();
    proof.uWitness = u;
    proof.cGammaWitness = ['0x' + cGammaWitness[0].toString('hex'), '0x' + cGammaWitness[1].toString('hex')];
    proof.sHashWitness = ['0x' + sHashWitness[0].toString('hex'), '0x' + sHashWitness[1].toString('hex')];
    proof.zInv = invZ.toString();
    return proof;
}


module.exports = {
    proofVRF: proofVRF
}
console.log(proofVRF(1));