
const BN = require("bn.js");

const randomBytes = require("crypto").randomBytes;

const A  = uint256(0)
const B  = uint256(7)
const GX = uint256("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 16)
const GY = uint256("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", 16)
/**
 * P = FIELD_SIZE
 * N = GROUP_ORDER
 */
const FIELD_SIZE  = uint256("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", 16)
const GROUP_ORDER  = uint256("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16)
const _0 = uint256(0)
const _1 = uint256(1)

function uint256(x, base = 16) {
    return new BN(x, base)
}

function rnd(P = FIELD_SIZE) {
    return uint256(randomBytes(32)).umod(P)
}

function mulmod(a, b, P = FIELD_SIZE) {
    return a.mul(b).umod(P)
}

function addmod(a, b, P = FIELD_SIZE) {
    return a.add(b).umod(P)
}

function invmod(a, P = FIELD_SIZE) {
    return a.invm(P)
}

// Returns x1/z1+x2/z2=(x1z2+x2z1)/(z1z2) in projective coordinates on P¹(𝔽ₙ)
function projectiveAdd(
    x1,
    z1,
    x2,
    z2
  ){
     {
    num1 = mulmod(z2, x1);
      // Note this cannot wrap since x2 is a point in [0, FIELD_SIZE-1]
      // we use unchecked to save gas.
    num2 = mulmod(x2, z1);
    [x3, z3] = [addmod(num1, num2), mulmod(z1, z2)];
    return [x3,z3];
    }
  }

// Returns x1/z1-x2/z2=(x1z2-x2z1)/(z1z2) in projective coordinates on P¹(𝔽ₙ)
function projectiveSub(
    x1,
    z1,
    x2,
    z2
  ){
     {
    num1 = mulmod(z2, x1);
      // Note this cannot wrap since x2 is a point in [0, FIELD_SIZE-1]
      // we use unchecked to save gas.
    num2 = mulmod(FIELD_SIZE.sub(x2), z1);
    [x3, z3] = [addmod(num1, num2), mulmod(z1, z2)];
    return [x3,z3];
    }
  }
// Returns x1/z1*x2/z2=(x1x2)/(z1z2), in projective coordinates on P¹(𝔽ₙ)
function projectiveMul(
     x1,
     z1,
     x2,
     z2
  ) {
    [x3, z3] = [mulmod(x1, x2), mulmod(z1, z2)];
    return [x3, z3];
  }

/** **************************************************************************
    @notice Computes elliptic-curve sum, in projective co-ordinates

    @dev Using projective coordinates avoids costly divisions

    @dev To use this with p and q in affine coordinates, call
    @dev projectiveECAdd(px, py, qx, qy). This will return
    @dev the addition of (px, py, 1) and (qx, qy, 1), in the
    @dev secp256k1 group.

    @dev This can be used to calculate the z which is the inverse to zInv
    @dev in isValidVRFOutput. But consider using a faster
    @dev re-implementation such as ProjectiveECAdd in the golang vrf package.

    @dev This function assumes [px,py,1],[qx,qy,1] are valid projective
            coordinates of secp256k1 points. That is safe in this contract,
            because this method is only used by linearCombination, which checks
            points are on the curve via ecrecover.
    **************************************************************************
    @param px The first affine coordinate of the first summand
    @param py The second affine coordinate of the first summand
    @param qx The first affine coordinate of the second summand
    @param qy The second affine coordinate of the second summand

    (px,py) and (qx,qy) must be distinct, valid secp256k1 points.
    **************************************************************************
    Return values are projective coordinates of [px,py,1]+[qx,qy,1] as points
    on secp256k1, in P²(𝔽ₙ)
    @return sx
    @return sy
    @return sz
*/
function projectiveECAdd(
    px, //x1
    py, //y1
    pz,
    qx, //x2
    qy, //y2
    qz
    )
{   
    let x3 = _0;
    let y3 = _0;
    let z3 = _0;
    if (px.isZero() && py.isZero()) {
        return [qx, qy, qz];
    }

    if (qx.isZero() && qy.isZero() ) {
        return [px, py, pz];
    }
    if(px.eq(qx) && py.eq(qy)){
        [lx, lz] = projectiveMul(px, pz, px, pz);
        [lx, lz] = projectiveMul(lx, lz, uint256(3), _1);
        [lx, lz] = projectiveAdd(lx, lz, A, _1);
        [da,db] = projectiveMul(py, pz, uint256(2), _1);
    }
    else{
        [lx, lz] = projectiveSub(qy, qz, py, pz);
        [da, db] = projectiveSub(qx, qz, px, pz);
    }

    [lx, lz] = projectiveMul(lx, lz, db, da);

    [x3, da] = projectiveMul(lx, lz, lx, lz);
    [x3, da] = projectiveSub(x3, da, px, pz);
    [x3, da] = projectiveSub(x3, da, qx, qz);

    [y3, db] = projectiveSub(px, pz, x3, da);
    [y3, db] = projectiveMul(y3, db, lx, lz);
    [y3, db] = projectiveSub(y3, db, py, pz);

    if (da != db) {
        x3 = mulmod(x3, db);
        y3 = mulmod(y3, da);
        z3 = mulmod(da, db);
    } else {
        z3 = da;
    }
    return [x3, y3, z3];
}

    // See "Group law for E/K : y^2 = x^3 + ax + b", in section 3.1.2, p. 80,
    // "Guide to Elliptic Curve Cryptography" by Hankerson, Menezes and Vanstone
    // We take the equations there for (sx,sy), and homogenize them to
    // projective coordinates. That way, no inverses are required, here, and we
    // only need the one inverse in affineECAdd.

    // We only need the "point addition" equations from Hankerson et al. Can
    // skip the "point doubling" equations because p1 == p2 is cryptographically
    // impossible, and required not to be the case in linearCombination.

    // Add extra "projective coordinate" to the two points
    function projectiveECMul(scalar, x,  y, z = _1)
    {
        let remaining = scalar;
        let px = x;
        let py = y;
        let pz = z;
        let acx = _0;
        let acy = _0;
        let acz = _1;

        if (scalar.isZero()) {
            return [_0, _0, _1];
        }

        while (!remaining.isZero()) {
            if (!(remaining.and(_1)).isZero()) {
                [acx,acy,acz] = projectiveECAdd(acx, acy, acz, px, py, pz);
            }
            remaining = remaining.div(uint256(2));
            [px, py, pz] = projectiveECAdd(px, py, pz, px, py, pz);
        }

        [x3, y3, z3] = [acx, acy, acz];
        return [x3, y3, z3];
    }
function affineECAdd(
    p1,
    p2,
){
    let x;
    let y;
    let z;
    [x, y, z] = projectiveECAdd(p1[0], p1[1], _1, p2[0], p2[1],_1);
    invZ = invmod(z);
    // Clear the z ordinate of the projective representation by dividing through
    // by it, to obtain the affine representation
    return [mulmod(x, invZ), mulmod(y, invZ)];
}

function affineECMul(
    scalar,
    P
){
    let x,y,z;
    [x,y,z] = projectiveECMul(scalar,P[0],P[1]);
    let invZ = invmod(z);
    return [mulmod(x,invZ), mulmod(y,invZ)]; 
}

let randomFunction = () => {
    let px = uint256('55066263022277343669578718895168534326250603453777594175500187360389116729240',10);
    let py = uint256('32670510020758816978083085130507043184471273380659243275938904335757337482424',10);
    let qx = uint256('89565891926547004231252920425935692360644145829622209833684329913297188986597',10);
    let qy = uint256('12158399299693830322967808612713398636155367887041628176798871954788371653930',10);
    P = [px,py]
    Q = [qx,qy]
    result = projectiveECAdd(px,py,_1,px,py,_1);
    invZ = invmod(result[2]);
    [result[0], result[1]] = [mulmod(result[0],invZ), mulmod(result[1],invZ)];
    console.log(result[0].toString(10) == '89565891926547004231252920425935692360644145829622209833684329913297188986597');
    console.log(result[1].toString(10) == '12158399299693830322967808612713398636155367887041628176798871954788371653930');
    console.log(result[2].toString(10) == '109190500074905412137678603254478706453141622139702147044039155107286148956845');

    sum = projectiveECAdd(px,py,_1,result[0],result[1],_1);
    invZ = invmod(sum[2]);
    [sum[0], sum[1]] = [mulmod(sum[0],invZ), mulmod(sum[1],invZ)];
    console.log(sum[0].toString(10) == '112711660439710606056748659173929673102114977341539408544630613555209775888121')
    console.log(sum[1].toString(10) == '25583027980570883691656905877401976406448868254816295069919888960541586679410')

    // hihi = affineECAdd(P,Q);
    // hihi.forEach(element => {
    //     console.log(element.toString(10))
    // });
    hihi = affineECMul(uint256(5),P);
    hihi.forEach(element => {
        console.log(element.toString(10))
    });
    
}

module.exports = {
    uint256: uint256,
    rnd: rnd,
    mulmod: mulmod,
    addmod: addmod,
    invmod: invmod,
    projectiveECAdd: projectiveECAdd,
    projectiveECMul: projectiveECMul,
    affineECAdd: affineECAdd,
    affineECMul: affineECMul,
    GX: GX,
    GY: GY,
    FIELD_SIZE: FIELD_SIZE,
    GROUP_ORDER: GROUP_ORDER
}