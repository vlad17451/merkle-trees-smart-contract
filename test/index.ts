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

const expandLeaves = (addresses: string[]): {address: string, index: number}[] => {
	// let addresses = whiteList;
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

function getLeaves(addresses: string[]) {
	let leaves = expandLeaves(addresses);
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

const computeMerkleProof = (index: number, addresses: string[]) => {
	let leaves = getLeaves(addresses);
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

function computeRootHash(addresses: string[]) {
	let leaves = getLeaves(addresses);
	while (leaves.length > 1) {
		reduceMerkleBranches(leaves);
	}
	return leaves[0];
}

interface ITree {
	amount: number,
	merkleRoot: string,
	leaves: {address: string, index: number, proof: string[]}[]
}

const getTree = (addresses: string[]): ITree => {
	let leaves = expandLeaves(addresses) as {address: string, index: number, proof: string[]}[];
	for(let i = 0; i < leaves.length; i++){
		leaves[i].proof = computeMerkleProof(i, addresses)
		// leaves[i].str = JSON.stringify(computeMerkleProof(i))
		// leaves[i].hash = ethers.utils.solidityKeccak256(["uint256", "address"], [leaves[i].index, leaves[i].address]);
	}
	return {
		merkleRoot: computeRootHash(addresses),
		amount: leaves.length,
		leaves: leaves
	};
}

const getProofByAddress = (tree: ITree, address: string): { index: number, proof: string[] } => {
	const { index, proof } = tree.leaves!.find((item: { address: string }) =>
		(item.address.toLowerCase() === address.toLowerCase())) as {address: string, index: number, proof: string[]}
	return { index, proof }
}

async function reDeploy() {
	const signers = await ethers.getSigners() as SignerWithAddress[]
	// const signers = (await ethers.getSigners()).slice(0, 15) as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
	whiteList = [
		...signers.map((signer) => signer.address),
	]
	// console.log(whiteList)
}

describe('Contract: Broker', () => {
	describe('', () => {
		it('', async () => {
			await reDeploy()
			const filledWhitelist = await ctf.fillWhitelist(whiteList)
			whiteList = [ ...filledWhitelist ]

			// const sortAddresses = await ctf.sortAddresses(whiteList)
			// console.log(1, sortAddresses)
			// console.log(2, expandLeaves(whiteList))

			const leaves = await ctf.getLeaves(whiteList)
			// console.log(1, leaves)
			// console.log(2, getLeaves(whiteList))

			// const hash = computeRootHash(whiteList)
			const hash =  await ctf.computeRootHash(whiteList)
			await ctf.setWhiteListRootHash(hash)
			// const r = await ctf.whiteListRootHash()
			// console.log('whiteListRootHash', r)
			// console.log('getTree', getTree())
			const tree = getTree(whiteList)

			const currentCandidate = user0

			const { index, proof } = getProofByAddress(tree, currentCandidate.address)

			// console.log(currentCandidate.address)
			// console.log(index)
			// console.log(proof)
			await ctf.connect(currentCandidate).capture(index, proof);

			expect(currentCandidate.address).to.be.equal(await ctf.currentFlagHolder())
		})
	})
})
