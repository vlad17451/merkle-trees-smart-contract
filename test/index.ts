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

const emptyPixel: Pixel = {
  x: 0,
  y: 0,
  color: 0
}

let history: Pixel[] = []

async function reDeploy() {
	signers = await ethers.getSigners() as SignerWithAddress[]
	[owner, user0, user1, user2, user3] = signers
	let CaptureTheFlag = await ethers.getContractFactory('CaptureTheFlag')
	ctf = await CaptureTheFlag.deploy() as CaptureTheFlag
  history = []
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

const fillPixels = (pixels: Pixel[]): Pixel[] => {
  let newLength = pixels.length;
  let newPixels = [ ...pixels ]
  while ((newLength & (newLength - 1)) !== 0) {
    newPixels.push(emptyPixel)
    newLength += 1
  }
  return newPixels
}

const getLeaves = (pixels: Pixel[]): string[] => pixels.map((pixel, i) => ethers
  .utils
  .solidityKeccak256(
    ["uint256", "uint256", "uint256", "uint256"],
    [i, pixel.x, pixel.y, pixel.color]
  ))

const getNodes = (pixels: Pixel[]): string[] => {
  const leaves = getLeaves(pixels)
  const length = leaves.length
  let nodes: string[] = [ ...leaves ]
  let path = length;
  let offset = 0;
  let iteration = length;
  while (path > 0) {
    for (let i = 0; i < path - 1; i += 2) {
      nodes[iteration] = ethers
        .utils
        .solidityKeccak256(
          ["bytes32", "bytes32"],
          [nodes[offset + i], nodes[offset + i + 1]]
        )
      iteration++;
    }
    offset += path;
    path /= 2;
  }
  return nodes;
}

const getProof = (index: number, pixels: Pixel[]): string[] => {
  if (pixels.length === 1) {
    return [ '0x0000000000000000000000000000000000000000000000000000000000000000' ]
  }
  const filledPixels = fillPixels(pixels)
  const length = filledPixels.length
  const proof: string[] = []
  const nodes = getNodes(filledPixels)
  let pathItem = index
  let pathLayer = length
  let offset = 0
  let iteration = 0
  while (pathLayer > 1) {
    let node = ''
    if ((pathItem % 2) === 1) {
      node = nodes[offset + pathItem - 1]
    } else {
      node = nodes[offset + pathItem + 1]
    }
    proof[iteration] = node;
    iteration++;
    offset += pathLayer
    pathLayer = Math.floor(pathLayer / 2)
    pathItem = Math.floor(pathItem / 2)
  }
  return proof
}

describe('Contract: Broker', () => {
	describe('main', () => {
		it('Should capture the flag', async () => {
			await reDeploy()
			const tx = await ctf.addPixel(pixel1, [])
			let receipt = await tx.wait() as any;
			// expect(owner.address).to.be.equal(receipt.events[0].args.newMember)
			history.push(pixel1)
			expect(await ctf.getRootHashByAge(0)).to.be.equal(ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256", "uint256"], [0, pixel1.x, pixel1.y, pixel1.color]))
			const index = 0
			const proof = getProof(index, history)
			await ctf.capture(pixel1, index, proof);
			expect(owner.address).to.be.equal(await ctf.currentFlagHolder())
		})
		it('Should add new member and capture the flag', async () => {

			const tx = await ctf.addPixel(pixel2, history)
			let receipt = await tx.wait() as any;
			// expect(newCandidate.address).to.be.equal(receipt.events[0].args.newMember)
			history.push(pixel2)
			const index = 1;
			const proof = await getProof(index, [
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

        let index = history.length;
        if (index % 64 === 0) {
          history = []
          index = 0
        }
        await ctf.addPixel(pixel, history)
				history.push(pixel)
				const proof = getProof(index, history)
				await ctf.capture(pixel, index, proof);
			}
			await reDeploy()
			for (let i = 0; i < 1000; i += 1) {
				console.log(i)
        console.log('history.length', history.length)
				await add()
			}
		}).timeout(10000000000)
	})
})
