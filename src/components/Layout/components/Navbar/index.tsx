import { Col, Row } from 'antd';
import { memo } from 'react';
import HistoryNavigation from './HistoryNavigation';
import Header from './Header';
import { Search } from './Search';
import useIsMobile from '../../../../utils/isMobile';

export const Navbar = memo(() => {
  const isMobile = useIsMobile();

  return (
    <Row
      align='middle'
      gutter={[8, 8]}
      className='navbar'
      justify='space-between'
      style={{ margin: '0 5px' }}
    >
      {!isMobile ? (
        <Col>
          <HistoryNavigation />
        </Col>
      ) : null}

      <Col flex={isMobile ? '1' : undefined} span={isMobile ? undefined : 0} md={12} lg={10} xl={8} style={{ textAlign: 'center' }}>
        <Search />
      </Col>

      <Col>
        <Header opacity={1} />
      </Col>
    </Row>
  );
});
