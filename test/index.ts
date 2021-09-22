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
let allAddresses: string[]

async function reDeploy() {
	const signers = await ethers.getSigners() as SignerWithAddress[]
	// const signers = (await ethers.getSigners()).slice(0, 15) as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
	whiteList = [
		...signers.slice(0, 12).map((signer) => signer.address),
	]
	allAddresses = [
		...signers.map((signer) => signer.address),
	]
}

describe('Contract: Broker', () => {
	describe('', () => {
		it('', async () => {
			await reDeploy()

			const hash =  await ctf.getRootHash(whiteList)

			await ctf.setWhiteListRootHash(hash)

			const currentCandidate = owner

			const proofResponse = await ctf.getProof(owner.address, whiteList)

			const proof = proofResponse.proof
			const index = proofResponse.index

			await ctf.connect(currentCandidate).capture(index, proof);

			expect(currentCandidate.address).to.be.equal(await ctf.currentFlagHolder())
		})
	})
})
