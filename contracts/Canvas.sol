pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Canvas is Ownable {
	
	mapping(uint256 => mapping(uint256 => bytes32)) pixelsRootHashByChunk;
	mapping(uint256 => uint256) chunkCounterByTokenId;
	
//	struct Canvas {
//		uint256 size;
//		uint256 background;
//		uint256 chunkCounter;
//		bytes32 whitelistRootHash;
//		mapping(uint256 => bytes32) pixelsRootHashByChunk;
//	}

	struct Pixel {
		uint256 x;
		uint256 y;
		uint256 color;
	}

	event PixelAdded(uint256 tokenId, uint256 x, uint256 y, uint256 color, uint256 chunk);

	function addPixel(uint256 tokenId, Pixel[] memory pixels) public {
		
		mapping(uint256 => bytes32) storage rootHash = pixelsRootHashByChunk[tokenId];
		uint256 chunkCounter = chunkCounterByTokenId[tokenId];
		
		bytes32 prevRootHash;
		if (chunkCounter != 0) {
			prevRootHash = rootHash[chunkCounter - 1];
		}
		
		bytes32 pixelsHash = generatePixelsRootHash(pixels);
		bytes32 chunkHash = getChunkHash(prevRootHash, pixelsHash);
	
		rootHash[chunkCounter] = chunkHash;
		
    for (uint256 i; i < pixels.length; i++) {
      emit PixelAdded(tokenId, pixels[i].x, pixels[i].y, pixels[i].color, chunkCounter);
    }
		
		chunkCounterByTokenId[tokenId]++;
	}
	
	function getChunkHash(bytes32 prevChunkRootHash, bytes32 pixelsHash) public pure returns(bytes32) {
		return keccak256(abi.encodePacked(prevChunkRootHash, pixelsHash));
	}

	function fillPixels(Pixel[] memory pixels) public pure returns(Pixel[] memory) {
		uint256 length = pixels.length;
		uint256 newLength = length;
		while (newLength & (newLength - 1) != 0) {
			newLength++;
		}
		Pixel[] memory newPixels = new Pixel[](newLength);
		for (uint256 i; i < length; i++) {
			newPixels[i] = pixels[i];
		}
		return newPixels;
	}

	function getPixelsLeaves(Pixel[] memory pixels) internal pure returns(bytes32[] memory) {
		uint256 length = pixels.length;
		bytes32[] memory leaves = new bytes32[](length);
		for (uint256 i; i < length; i++) {
			leaves[i] = keccak256(abi.encodePacked(i, pixels[i].x, pixels[i].y, pixels[i].color));
		}
		return leaves;
	}

	function getNodes(bytes32[] memory leaves) internal pure returns(bytes32[] memory) {
		uint256 length = leaves.length;
		uint256 nodeCount = (length * 2) - 1;
		bytes32[] memory nodes = new bytes32[](nodeCount);
		for (uint256 i = 0; i < leaves.length; i++) {
			nodes[i] = leaves[i];
		}
		uint256 path = length;
		uint256 offset = 0;
		uint256 iteration = length;
		while (path > 0) {
			for (uint256 i = 0; i < path - 1; i += 2) {
				nodes[iteration] = keccak256(
					abi.encodePacked(nodes[offset + i], nodes[offset + i + 1])
				);
				iteration++;
			}
			offset += path;
			path /= 2;
		}
		return nodes;
	}

	function generatePixelsRootHash(Pixel[] memory pixels) internal pure returns(bytes32) {
		if (pixels.length == 0) {
			return bytes32(0);
		}
		bytes32[] memory nodes = getNodes(getPixelsLeaves(fillPixels(pixels)));
		return nodes[nodes.length - 1];
	}

	function verifyPixel(
		uint256 tokenId,
		Pixel memory pixel,
		uint256 index,
		bytes32[] calldata proof,
		uint256 chunk
	) public view returns(bool) {
		bytes32 node = keccak256(abi.encodePacked(index, pixel.x, pixel.y, pixel.color));
		uint256 path = index;
		if (proof[0] != 0) {
			for (uint16 i = 0; i < proof.length; i++) {
				if ((path & 0x01) == 1) {
					node = keccak256(abi.encodePacked(proof[i], node));
				} else {
					node = keccak256(abi.encodePacked(node, proof[i]));
				}
				path /= 2;
			}
		}
		bytes32 prevRootHash;
		if (chunk != 0) {
			prevRootHash = pixelsRootHashByChunk[tokenId][chunk - 1];
		}
		bytes32 chunkHash = getChunkHash(prevRootHash, node);
		return chunkHash == pixelsRootHashByChunk[tokenId][chunk];
	}

  function getPixelsRootHash(uint256 tokenId, uint256 chunk) public view returns(bytes32) {
    return pixelsRootHashByChunk[tokenId][chunk];
  }
}
