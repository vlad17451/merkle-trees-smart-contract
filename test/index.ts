import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { expect, assert } from 'chai'

import BigNumber from 'bignumber.js'
BigNumber.config({ EXPONENTIAL_AT: 60 })

import Web3 from 'web3'
// @ts-ignore
const web3 = new Web3(network.provider) as Web3

import { CaptureTheFlag } from '../typechain'

let ctf: CaptureTheFlag

let owner: SignerWithAddress
let user0: SignerWithAddress
let user1: SignerWithAddress
let user2: SignerWithAddress
let user3: SignerWithAddress


let whiteList: string[]

const expandLeaves = () => {
	let addresses = whiteList;
	addresses.sort(function(a, b) {
		let al = a.toLowerCase(), bl = b.toLowerCase();
		if (al < bl) { return -1; }
		if (al > bl) { return 1; }
		return 0;
	});
	return addresses.map((a, i) => ({
		address: a.toLowerCase(),
		index: i,
	}));
}

function getLeaves() {
	let leaves = expandLeaves();
	return leaves.map((leaf) =>
		ethers.utils.solidityKeccak256(["uint256", "address"], [leaf.index, leaf.address]));
}

function reduceMerkleBranches(leaves: string[]) {
	let output = [];
	while (leaves.length) {
		let left = leaves.shift();
		let right = (leaves.length === 0) ? left: leaves.shift();
		// @ts-ignore
		output.push(ethers.utils.keccak256(left + right.substring(2)));
	}
	output.forEach(function(leaf) {
		leaves.push(leaf);
	});
}

const computeMerkleProof = (index: number) => {
	let leaves = getLeaves();
	if (index == null) { throw new Error('address not found'); }
	let path = index;
	let proof = [];
	while (leaves.length > 1) {
		let item
		if ((path % 2) === 1) {
			item = leaves[path - 1]
		} else {
			item = leaves[path + 1]
		}
		if (item) {
			proof.push(item)
		}
		reduceMerkleBranches(leaves);
		path = Math.floor(path / 2);
	}
	return proof;
}

function computeRootHash() {
	let leaves = getLeaves();
	while (leaves.length > 1) {
		reduceMerkleBranches(leaves);
	}
	return leaves[0];
}

const getMerkleTree = () => {
	let leaves = expandLeaves() as any;
	for(let i = 0; i < leaves.length; i++){
		leaves[i].proof = computeMerkleProof(i)
		leaves[i].str = JSON.stringify(computeMerkleProof(i))
		// leaves[i].hash = ethers.utils.solidityKeccak256(["uint256", "address"], [leaves[i].index, leaves[i].address]);
	}
	return {
		merkleRoot: computeRootHash(),
		amount: leaves.length,
		leaves: leaves
	};
}

async function reDeploy() {
	// const signers = await ethers.getSigners() as SignerWithAddress[]
	const signers = (await ethers.getSigners()).slice(0, 15) as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
	whiteList = [
		...signers.map((signer) => signer.address),
	]
}

describe('Contract: Broker', () => {
	describe('', () => {
		it('', async () => {
			await reDeploy()
			const hash = computeRootHash()
			// console.log('Root hash', hash)
			await ctf.setWhiteListRootHash(hash)
			// const r = await ctf.whiteListRootHash()
			// console.log('whiteListRootHash', r)
			// console.log('getMerkleTree', getMerkleTree())
			const merkleTree = getMerkleTree() as any

			const currentCandidate = user1

			const { index, proof } = merkleTree.leaves
				.find((item: SignerWithAddress) =>
				item.address.toLowerCase() === currentCandidate.address.toLowerCase())

			// console.log(currentCandidate.address)
			// console.log(index)
			// console.log(proof)
			await ctf.connect(currentCandidate).capture(index, proof);

			expect(currentCandidate.address).to.be.equal(await ctf.currentFlagHolder())
		})
	})
})
