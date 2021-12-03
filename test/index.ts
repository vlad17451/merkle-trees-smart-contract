import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers, network } from 'hardhat'
import { expect, assert } from 'chai'

import BigNumber from 'bignumber.js'
BigNumber.config({ EXPONENTIAL_AT: 60 })

import Web3 from 'web3'
// @ts-ignore
const web3 = new Web3(network.provider) as Web3

import { Canvas } from '../typechain'

let ctf: Canvas

let owner: SignerWithAddress
let user0: SignerWithAddress
let user1: SignerWithAddress
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
	[owner, user0, user1] = signers
	let Canvas = await ethers.getContractFactory('Canvas')
	ctf = await Canvas.deploy() as Canvas
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

const TOKEN_ID = 0

describe('Contract: Broker', () => {
	// describe('main', () => {
	it('Should verify the flag', async () => {
		await reDeploy()
		const tx = await ctf.addPixel(TOKEN_ID, [ pixel1 ])
		let receipt = await tx.wait() as any;
		// expect(owner.address).to.be.equal(receipt.events[0].args.newMember)

		expect(await ctf.getRootHashByChunk(TOKEN_ID, 0)).to.be.equal(
			ethers.utils.solidityKeccak256(
				["uint256", "uint256", "uint256", "uint256"],
				[0, pixel1.x, pixel1.y, pixel1.color]
			)
		)
		const pixelIndex = 0
		const proof = getProof(pixelIndex, [ pixel1 ])
		const isOk = await ctf.verify(0, pixel1, pixelIndex, proof, 0);
		expect(isOk).to.be.equal(true)
	})
	it('Should verify the flag', async () => {
		const tx = await ctf.addPixel(TOKEN_ID, [ pixel1 ])
		let receipt = await tx.wait() as any;
		// expect(owner.address).to.be.equal(receipt.events[0].args.newMember)
		expect(await ctf.getRootHashByChunk(TOKEN_ID, 1)).to.be.equal(
			ethers.utils.solidityKeccak256(
				["uint256", "uint256", "uint256", "uint256"],
				[0, pixel1.x, pixel1.y, pixel1.color]
			)
		)
		const pixelIndex = 0
		const proof = getProof(pixelIndex, [ pixel1 ])
		const isOk = await ctf.verify(TOKEN_ID, pixel1, pixelIndex, proof, 1);
		expect(isOk).to.be.equal(true)
	})
	// 	it('Should add new member and verify the flag', async () => {
	//
	// 		const tx = await ctf.addPixel([ pixel2 ], history)
	// 		let receipt = await tx.wait() as any;
	// 		// expect(newCandidate.address).to.be.equal(receipt.events[0].args.newMember)
	// 		history.push(pixel2)
	// 		const index = 1;
	// 		const proof = await getProof(index, [
	// 			pixel1,
	// 			pixel2
	// 		])
	// 		await ctf.verify({
	// 			x: 3,
	// 			y: 3,
	// 			color: 444
	// 		}, index, proof);
	// 	})
	// 	it('Stress test', async () => {
	//
	// 	  let chunk: Pixel[] = []
	//
	// 		const add = async () => {
	// 			const pixel: Pixel = {
	// 				x: 1,
	// 				y: 2,
	// 				color: 123
	// 			}
	//
  //       let index = chunk.length;
	// 			const pixelsPerAge = Number(await ctf.pixelsPerChunk())
  //       if (index % pixelsPerAge === 0) {
  //         chunk = []
  //         index = 0
  //       }
  //       await ctf.addPixel([ pixel, pixel ], chunk)
  //       chunk.push(pixel)
  //       chunk.push(pixel)
	//
	// 			const proof = getProof(index, chunk)
  //       const isOk = await ctf.verify(pixel, index, proof);
  //       expect(isOk).to.be.equal(true)
	// 		}
	// 		await reDeploy()
	// 		for (let i = 0; i < 4; i += 1) {
	// 			console.log(i, chunk.length)
	// 			await add()
	// 		}
	// 	}).timeout(10000000000)
	// })
})
