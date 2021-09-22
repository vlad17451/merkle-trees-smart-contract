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


let whiteList: string[]
let allAddresses: string[]

async function reDeploy() {
	signers = await ethers.getSigners() as SignerWithAddress[]
	// const signers = (await ethers.getSigners()).slice(0, 15) as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
	whiteList = [
		...signers.map((signer) => signer.address),
	]
}

describe('Contract: Broker', () => {
	describe('main', () => {
		it('Should capture the flag', async () => {
			await reDeploy()
			const hash = await ctf.getRootHash(whiteList)
			await ctf.setWhiteListRootHash(hash)
			const currentCandidate = signers[12]
			const proofResponse = await ctf.getProof(currentCandidate.address, whiteList)
			const proof = proofResponse.proof
			const index = proofResponse.index
			await ctf.connect(currentCandidate).capture(index, proof);
			expect(currentCandidate.address).to.be.equal(await ctf.currentFlagHolder())
		})
		it('Should add new member and capture the flag', async () => {
			const newList = [ ...whiteList, signers[13].address ]
			const hash2 = await ctf.getRootHash(newList)
			await ctf.setWhiteListRootHash(hash2)
			const newCandidate = signers[12]
			const proofResponse2 = await ctf.getProof(newCandidate.address, newList)
			const proof2 = proofResponse2.proof
			const index2 = proofResponse2.index
			await ctf.connect(newCandidate).capture(index2, proof2);
			expect(newCandidate.address).to.be.equal(await ctf.currentFlagHolder())
		})
	})
})
