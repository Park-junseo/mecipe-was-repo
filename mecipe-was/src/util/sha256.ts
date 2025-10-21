// 출처: https://geraintluff.github.io/sha256/

function sha256(ascii: string): string {
    function rightRotate(value: number, amount: number) {
        return (value >>> amount) | (value << (32 - amount));
    }

    let mathPow = Math.pow;
    let maxWord = mathPow(2, 32);
    let lengthProperty = "length";

    let i: number, j: number;
    let result = "";

    let words: number[] = [];
    let asciiBitLength = ascii.length * 8;

    let hash = (sha256 as any).h || [];
    let k = (sha256 as any).k || [];
    let primeCounter = k[lengthProperty];

    if (hash[lengthProperty] === 0) {
        let isPrime: { [key: number]: number } = {};
        let candidate = 2;
        while (primeCounter < 64) {
            if (!isPrime[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isPrime[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
            candidate++;
        }
        (sha256 as any).h = hash;
        (sha256 as any).k = k;
    }

    ascii += "\x80"; // Append '1' bit (plus zero padding)
    while ((ascii.length % 64) - 56) ascii += "\x00"; // More zero padding
    for (i = 0; i < ascii.length; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return ""; // ASCII check
        words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    for (j = 0; j < words.length; ) {
        let w = words.slice(j, (j += 16));
        let oldHash = hash.slice(0);

        for (i = 0; i < 64; i++) {
            let w15 = w[i - 15], w2 = w[i - 2];

            let a = hash[0], e = hash[4];
            let temp1 = hash[7] +
                (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
                ((e & hash[5]) ^ (~e & hash[6])) +
                k[i] +
                (w[i] = i < 16 ? w[i] : (
                    w[i - 16] +
                    (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                    w[i - 7] +
                    (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0);
            let temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
                ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [
                (temp1 + temp2) | 0,
                a,
                hash[1],
                hash[2],
                (hash[3] + temp1) | 0,
                hash[4],
                hash[5],
                hash[6]
            ];
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            let b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? "0" : "") + b.toString(16);
        }
    }
    return result;
}

export function createSignedMessage(data: string, SECRET: string): { payload: string, signature: string } {
    const signature = sha256(data + SECRET);
    return {
        payload: data,
        signature: signature
    };
}

export function verifySignedMessage(message: { payload: string, signature: string }, SECRET: string): boolean {
    const expectedSignature = sha256(message.payload + SECRET);
    return message.signature === expectedSignature;
}