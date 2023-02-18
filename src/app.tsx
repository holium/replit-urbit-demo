import React, { useState, useEffect } from 'react'
import { Button, MemeBlock, InputBox, Text } from '@holium/design-system'
import { SegmentedControl } from '@mantine/core'
import Tome, { FeedStore, KeyValueStore } from '@holium/tome-db'
import { Box, Center, Cover, Stack } from './components/index'
import './index.css'

export function App() {
    const [data, setData] = useState([])
    const [feed, setFeed] = useState<FeedStore>()
    const [kv, setKV] = useState<KeyValueStore>()
    const [link, setLink] = useState('')
    const [sortType, setSortType] = useState('Popularity')
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        async function init() {
            const api = undefined
            const db = await Tome.init(api, 'racket')
            const feed = await db.feed({
                preload: true,
                onLoadChange: setLoaded,
                onDataChange: (data) => {
                    console.log(data)
                    let sorted = data
                    if (sortType === 'Popularity') {
                        sorted = data.sort(
                            (a, b) =>
                                Object.keys(b.links).length -
                                Object.keys(a.links).length
                        )
                    }
                    setData([...sorted])
                },
            })
            const kv = await db.keyvalue({
                bucket: 'preferences',
                preload: false,
            })
            setKV(kv)
            setFeed(feed)
            const _sortType = await kv.get('sortType')
            if (_sortType) {
                setSortType(_sortType)
            } else {
                await kv.set('sortType', 'Popularity')
                setSortType('Popularity')
            }
        }
        init()
    }, [sortType])

    const ListItems =
        data.length > 0 ? (
            data.map((item: any, index: number) => {
                const reactions = []
                Object.entries(item.links).map(([author, emoji]) => {
                    const reaction = {}
                    Object.assign(reaction, { author, emoji })
                    reactions.push(reaction)
                })
                return (
                    <MemeBlock
                        zIndex={data.length - index}
                        key={item.id}
                        id={item.id}
                        image={item.content}
                        by={item.createdBy}
                        date={new Date(item.createdAt).toUTCString()}
                        reactions={reactions}
                        onReaction={(payload) => {
                            console.log(payload)
                            if (payload.action === 'remove') {
                                feed?.removeLink(item.id)
                            } else if (payload.action === 'add') {
                                if (item.createdBy in item.links) {
                                    feed?.removeLink(item.id)
                                }
                                feed?.setLink(item.id, payload.emoji)
                            }
                        }}
                        width={400}
                    />
                )
            })
        ) : (
            <div>
                <Text.Caption color="base">No memes posted</Text.Caption>
            </div>
        )

    return (
        <Cover centered=".posts" space="16px">
            <Center className="header">
                <Box padding="8px 8px 8px">
                    <SegmentedControl
                        data={[
                            { value: 'Popularity', label: 'Popularity' },
                            { value: 'Date', label: 'Date' },
                        ]}
                        color="blue"
                        size="md"
                        value={sortType}
                        onChange={async (type) => {
                            setSortType(type)
                            await kv.set('sortType', type)
                        }}
                    />
                </Box>
            </Center>
            <Center className="posts">
                {loaded && feed && (
                    <Box padding="48px">
                        <Stack space="8px" className="posts">
                            {ListItems}
                        </Stack>
                    </Box>
                )}
            </Center>
            <Center className="footer">
                <Box padding="0px 16px 16px">
                    <InputBox
                        rightAdornment={
                            <Button.Primary
                                height={32}
                                px={2}
                                fontSize="16px"
                                onClick={async () => {
                                    if (link !== '') {
                                        const id = await feed?.post(link)
                                        setLink('')
                                    }
                                }}
                            >
                                Post
                            </Button.Primary>
                        }
                        inputId="input-2"
                    >
                        <input
                            id="input-2"
                            tabIndex={1}
                            placeholder="Paste meme link"
                            value={link}
                            onChange={(event) => setLink(event.target.value)}
                        />
                    </InputBox>
                </Box>
            </Center>
        </Cover>
    )
}
