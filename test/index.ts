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
let signers: SignerWithAddress[]

type Pixel = {
	x: number,
	y: number,
	color: number
}

let history: Pixel[] = []

async function reDeploy() {
	signers = await ethers.getSigners() as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
}

const pixel1 = {
	x: 1,
	y: 2,
	color: 123
}

const pixel2 = {
	x: 3,
	y: 3,
	color: 444
}

// TODO getProof from js
// addPixels by array
// give to smart array of hashes instead of array of structs

describe('Contract: Broker', () => {
	describe('main', () => {
		it('Should capture the flag', async () => {
			await reDeploy()
			const tx = await ctf.addPixel(pixel1, [])
			let receipt = await tx.wait() as any;
			// expect(owner.address).to.be.equal(receipt.events[0].args.newMember)
			history.push(pixel1)
			expect(await ctf.rootHash()).to.be.equal(ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256", "uint256"], [0, pixel1.x, pixel1.y, pixel1.color]))
			const index = 0
			const proof = await ctf.getProof(index, history)
			await ctf.capture(pixel1, index, proof);
			expect(owner.address).to.be.equal(await ctf.currentFlagHolder())
		})
		it('Should add new member and capture the flag', async () => {

			const newCandidate = user0
			const tx = await ctf.addPixel(pixel2, history)
			let receipt = await tx.wait() as any;
			// expect(newCandidate.address).to.be.equal(receipt.events[0].args.newMember)
			history.push(pixel2)
			const index = 1;
			const proof = await ctf.getProof(index, [
				pixel1,
				pixel2
			])
			await ctf.capture({
				x: 3,
				y: 3,
				color: 444
			}, index, proof);
		})
		it('Stress test', async () => {
			const add = async () => {
				const pixel: Pixel = {
					x: 1,
					y: 2,
					color: 123
				}
				await ctf.addPixel(pixel, history)
				history.push(pixel)

				const index = history.length - 1;
				const proof = await ctf.getProof(index, history)
				await ctf.capture(pixel, index, proof);
			}
			for (let i = 0; i < 1000; i += 1) {
				console.log(i)
				await add()
			}
		}).timeout(100000000)
	})
})
