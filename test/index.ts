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


let whiteList: string[] = []
let allAddresses: string[]

async function reDeploy() {
	signers = await ethers.getSigners() as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
}

describe('Contract: Broker', () => {
	describe('main', () => {
		it('Should capture the flag', async () => {
			await reDeploy()
			const tx = await ctf.addMember(owner.address, [])
			let receipt = await tx.wait() as any;
			expect(owner.address).to.be.equal(receipt.events[0].args.newMember)
			whiteList.push(owner.address)
			expect(await ctf.whiteListRootHash()).to.be.equal(ethers.utils.solidityKeccak256(["uint256", "address"], [0, owner.address]))
			const proofResponse = await ctf.getProof(owner.address, [ owner.address ])
			const proof = proofResponse.proof
			const index = proofResponse.index
			await ctf.capture(index, proof);
			expect(owner.address).to.be.equal(await ctf.currentFlagHolder())
		})
		it('Should add new member and capture the flag', async () => {
			const newCandidate = user0
			const tx = await ctf.addMember(newCandidate.address, whiteList)
			let receipt = await tx.wait() as any;
			expect(newCandidate.address).to.be.equal(receipt.events[0].args.newMember)
			whiteList.push(newCandidate.address)
			const proofResponse = await ctf.getProof(newCandidate.address, whiteList)
			const proof = proofResponse.proof
			const index = proofResponse.index
			await ctf.connect(newCandidate).capture(index, proof);
		})

	})
})
